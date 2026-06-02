import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, getDb } from './firebase';

const RECORD_CACHE_PREFIX = '@gymbro/record-cache';
const PENDING_MUTATIONS_PREFIX = '@gymbro/pending-record-mutations';

let pendingSyncPromise = null;

const getCurrentUserId = () => {
  const uid = auth.currentUser?.uid;

  if (!uid) {
    const error = new Error('Sign in before saving records to Firebase.');
    error.code = 'auth/not-logged-in';
    throw error;
  }

  return uid;
};

const getCacheKey = (collectionName) => `${RECORD_CACHE_PREFIX}:${getCurrentUserId()}:${collectionName}`;

const getPendingKey = () => `${PENDING_MUTATIONS_PREFIX}:${getCurrentUserId()}`;

const userCollection = (collectionName) => collection(getDb(), 'users', getCurrentUserId(), collectionName);

const toCacheValue = (value) => {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toCacheValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, toCacheValue(entryValue)])
    );
  }

  return value;
};

const normalizeRecord = (record) => ({
  id: record.id,
  ...toCacheValue(record),
});

const getRecordTime = (record) => {
  const sourceValue = record?.createdAt ?? record?.updatedAt ?? 0;

  if (typeof sourceValue === 'number') {
    return sourceValue;
  }

  if (typeof sourceValue === 'string') {
    const parsedTime = Date.parse(sourceValue);

    return Number.isFinite(parsedTime) ? parsedTime : 0;
  }

  if (sourceValue && typeof sourceValue.toDate === 'function') {
    return sourceValue.toDate().getTime();
  }

  return 0;
};

const sortRecords = (records) => [...records].sort((left, right) => getRecordTime(right) - getRecordTime(left));

const readJsonValue = async (key, fallbackValue) => {
  const storedValue = await AsyncStorage.getItem(key);

  if (!storedValue) {
    return fallbackValue;
  }

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    return fallbackValue;
  }
};

const writeJsonValue = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const readCachedRecords = async (collectionName) => {
  const cachedRecords = await readJsonValue(getCacheKey(collectionName), []);

  return Array.isArray(cachedRecords) ? cachedRecords : [];
};

const writeCachedRecords = async (collectionName, records) => {
  await writeJsonValue(getCacheKey(collectionName), sortRecords(records.map(normalizeRecord)));
};

const updateCachedRecords = async (collectionName, updater) => {
  const currentRecords = await readCachedRecords(collectionName);
  const nextRecords = updater(currentRecords);

  await writeCachedRecords(collectionName, nextRecords);
  return nextRecords;
};

const readPendingMutations = async () => {
  const pendingMutations = await readJsonValue(getPendingKey(), []);

  return Array.isArray(pendingMutations) ? pendingMutations : [];
};

const writePendingMutations = async (mutations) => {
  await writeJsonValue(getPendingKey(), mutations);
};

const enqueuePendingMutation = async (mutation) => {
  const pendingMutations = await readPendingMutations();
  pendingMutations.push(mutation);
  await writePendingMutations(pendingMutations);
};

const runPendingMutations = async () => {
  const pendingMutations = await readPendingMutations();

  if (pendingMutations.length === 0) {
    return;
  }

  const remainingMutations = [...pendingMutations];

  while (remainingMutations.length > 0) {
    const mutation = remainingMutations[0];
    const recordRef = doc(getDb(), 'users', getCurrentUserId(), mutation.collectionName, mutation.recordId);

    try {
      if (mutation.type === 'set') {
        await setDoc(recordRef, mutation.data);
      } else if (mutation.type === 'update') {
        await updateDoc(recordRef, mutation.data);
      } else if (mutation.type === 'delete') {
        await deleteDoc(recordRef);
      }

      remainingMutations.shift();
    } catch (error) {
      break;
    }
  }

  await writePendingMutations(remainingMutations);
};

const triggerPendingMutationSync = () => {
  if (pendingSyncPromise) {
    return pendingSyncPromise;
  }

  pendingSyncPromise = runPendingMutations()
    .catch(() => {})
    .finally(() => {
      pendingSyncPromise = null;
    });

  return pendingSyncPromise;
};

const createLocalRecord = (payload) => ({
  ...payload,
  createdAt: payload.createdAt ?? new Date().toISOString(),
  updatedAt: payload.updatedAt ?? new Date().toISOString(),
});

const getServerRecords = async (collectionName) => {
  const snapshot = await getDocs(userCollection(collectionName));

  return snapshot.docs.map((record) => normalizeRecord({
    id: record.id,
    ...record.data(),
  }));
};

export const saveUserProfile = async ({ displayName, email }) => {
  const uid = getCurrentUserId();

  await setDoc(
    doc(getDb(), 'users', uid),
    {
      displayName,
      email: email ?? auth.currentUser?.email ?? '',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  );
};

export const saveExerciseRecord = async (exercise) => {
  const recordId = doc(userCollection('exerciseRecords')).id;
  const recordRef = doc(getDb(), 'users', getCurrentUserId(), 'exerciseRecords', recordId);
  const nextRecord = createLocalRecord(exercise);

  await updateCachedRecords('exerciseRecords', (records) => [
    ...records,
    {
      id: recordId,
      ...nextRecord,
    },
  ]);

  await enqueuePendingMutation({
    type: 'set',
    collectionName: 'exerciseRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();

  return recordRef;
};

export const updateExerciseRecord = async (recordId, exercise) => {
  const existingRecord = (await readCachedRecords('exerciseRecords')).find((record) => record.id === recordId);
  const nextRecord = createLocalRecord({
    ...exercise,
    createdAt: existingRecord?.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await updateCachedRecords('exerciseRecords', (records) =>
    records.map((record) => (record.id === recordId ? { ...record, ...nextRecord } : record))
  );

  await enqueuePendingMutation({
    type: 'update',
    collectionName: 'exerciseRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();
};

export const deleteExerciseRecord = async (recordId) => {
  await updateCachedRecords('exerciseRecords', (records) =>
    records.filter((record) => record.id !== recordId)
  );

  await enqueuePendingMutation({
    type: 'delete',
    collectionName: 'exerciseRecords',
    recordId,
  });

  triggerPendingMutationSync();
};

export const saveMeasurementRecord = async (measurement) => {
  const recordId = doc(userCollection('measurementRecords')).id;
  const recordRef = doc(getDb(), 'users', getCurrentUserId(), 'measurementRecords', recordId);
  const nextRecord = createLocalRecord(measurement);

  await updateCachedRecords('measurementRecords', (records) => [
    ...records,
    {
      id: recordId,
      ...nextRecord,
    },
  ]);

  await enqueuePendingMutation({
    type: 'set',
    collectionName: 'measurementRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();

  return recordRef;
};

export const updateMeasurementRecord = async (recordId, measurement) => {
  const existingRecord = (await readCachedRecords('measurementRecords')).find((record) => record.id === recordId);
  const nextRecord = createLocalRecord({
    ...measurement,
    createdAt: existingRecord?.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await updateCachedRecords('measurementRecords', (records) =>
    records.map((record) => (record.id === recordId ? { ...record, ...nextRecord } : record))
  );

  await enqueuePendingMutation({
    type: 'update',
    collectionName: 'measurementRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();
};

export const deleteMeasurementRecord = async (recordId) => {
  await updateCachedRecords('measurementRecords', (records) =>
    records.filter((record) => record.id !== recordId)
  );

  await enqueuePendingMutation({
    type: 'delete',
    collectionName: 'measurementRecords',
    recordId,
  });

  triggerPendingMutationSync();
};

export const savePrRecord = async (pr) => {
  const recordId = doc(userCollection('prRecords')).id;
  const recordRef = doc(getDb(), 'users', getCurrentUserId(), 'prRecords', recordId);
  const nextRecord = createLocalRecord(pr);

  await updateCachedRecords('prRecords', (records) => [
    ...records,
    {
      id: recordId,
      ...nextRecord,
    },
  ]);

  await enqueuePendingMutation({
    type: 'set',
    collectionName: 'prRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();

  return recordRef;
};

export const updatePrRecord = async (recordId, pr) => {
  const existingRecord = (await readCachedRecords('prRecords')).find((record) => record.id === recordId);
  const nextRecord = createLocalRecord({
    ...pr,
    createdAt: existingRecord?.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await updateCachedRecords('prRecords', (records) =>
    records.map((record) => (record.id === recordId ? { ...record, ...nextRecord } : record))
  );

  await enqueuePendingMutation({
    type: 'update',
    collectionName: 'prRecords',
    recordId,
    data: nextRecord,
  });

  triggerPendingMutationSync();
};

export const deletePrRecord = async (recordId) => {
  await updateCachedRecords('prRecords', (records) => records.filter((record) => record.id !== recordId));

  await enqueuePendingMutation({
    type: 'delete',
    collectionName: 'prRecords',
    recordId,
  });

  triggerPendingMutationSync();
};

export const fetchUserRecords = async (collectionName) => {
  triggerPendingMutationSync();

  const cachedRecords = sortRecords(await readCachedRecords(collectionName));

  if (cachedRecords.length > 0) {
    return cachedRecords;
  }

  try {
    const serverRecords = await getServerRecords(collectionName);
    await writeCachedRecords(collectionName, serverRecords);

    return sortRecords(serverRecords);
  } catch (error) {
    return cachedRecords;
  }
};

export const fetchLatestUserRecords = async (collectionName, recordLimit = 5) => {
  const records = await fetchUserRecords(collectionName);

  return sortRecords(records).slice(0, recordLimit);
};