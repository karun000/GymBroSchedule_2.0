import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, getDb } from './firebase';

const RECORD_CACHE_PREFIX = '@gymbro/record-cache';
const PENDING_MUTATIONS_PREFIX = '@gymbro/pending-record-mutations';

let pendingSyncPromise = null;

// Per-user lock chain that guarantees enqueuePendingMutation and
// runPendingMutations never read/modify/write the pending-mutations
// AsyncStorage key concurrently. Without this, a mutation queued while a
// background sync is in-flight can be silently dropped (see below).
const pendingMutationLocks = new Map();

const withPendingMutationsLock = (userId, task) => {
  const previousLink = pendingMutationLocks.get(userId) || Promise.resolve();
  const resultPromise = previousLink.then(() => task());

  // Keep the chain alive even if a task throws, so future callers aren't
  // stuck waiting on a rejected promise forever.
  pendingMutationLocks.set(userId, resultPromise.catch(() => {}));

  return resultPromise;
};

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

const getRecordOrder = (record) => {
  const parsedOrder = Number(record?.order);

  return Number.isFinite(parsedOrder) ? Math.trunc(parsedOrder) : null;
};

const sortRecords = (records, collectionName = '') => [...records].sort((left, right) => {
  if (collectionName === 'exerciseRecords') {
    const leftOrder = getRecordOrder(left);
    const rightOrder = getRecordOrder(right);

    if (leftOrder !== null && rightOrder !== null) {
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
    } else if (leftOrder !== null) {
      return -1;
    } else if (rightOrder !== null) {
      return 1;
    }
  }

  return getRecordTime(right) - getRecordTime(left);
});

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
  await writeJsonValue(getCacheKey(collectionName), sortRecords(records.map(normalizeRecord), collectionName));
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

// FIXED: previously this did an unsynchronized read -> push -> write on the
// pending-mutations key. If a background sync (runPendingMutations) was
// mid-flight at the same time, its own read-once/write-once cycle could
// clobber this write and silently drop the mutation (e.g. an exercise's new
// `order` value never reaching Firestore). Wrapping both functions in the
// same per-user lock makes these operations mutually exclusive.
const enqueuePendingMutation = async (mutation) => {
  const userId = getCurrentUserId();

  return withPendingMutationsLock(userId, async () => {
    const pendingMutations = await readPendingMutations();
    pendingMutations.push(mutation);
    await writePendingMutations(pendingMutations);

    if (Object.prototype.hasOwnProperty.call(mutation.data ?? {}, 'order')) {
      // console.log(
      //   '[Order] Enqueued',
      //   mutation.type,
      //   mutation.collectionName,
      //   mutation.recordId,
      //   '-> order =',
      //   mutation.data.order,
      //   '| queue length =',
      //   pendingMutations.length
      // );
    }
  });
};

// FIXED: now runs fully inside the same lock as enqueuePendingMutation, so
// new mutations queued by the UI while this is syncing to Firestore can
// never be lost. Each successfully-synced mutation is removed and the
// remaining list is only ever written back while still holding the lock.
const runPendingMutations = async () => {
  const userId = getCurrentUserId();

  return withPendingMutationsLock(userId, async () => {
    const pendingMutations = await readPendingMutations();

    if (pendingMutations.length === 0) {
      return;
    }

    // console.log(
    //   '[Order] Syncing pending mutations to Firestore:',
    //   pendingMutations.map((m) => ({
    //     id: m.recordId,
    //     type: m.type,
    //     order: m.data?.order,
    //   }))
    // );

    const remainingMutations = [...pendingMutations];

    while (remainingMutations.length > 0) {
      const mutation = remainingMutations[0];
      const recordRef = doc(getDb(), 'users', userId, mutation.collectionName, mutation.recordId);

      try {
        if (mutation.type === 'set') {
          await setDoc(recordRef, mutation.data);
        } else if (mutation.type === 'update') {
          await updateDoc(recordRef, mutation.data);
        } else if (mutation.type === 'delete') {
          await deleteDoc(recordRef);
        }

        if (Object.prototype.hasOwnProperty.call(mutation.data ?? {}, 'order')) {
          console.log('[Order] Synced', mutation.recordId, '-> order =', mutation.data.order);
        }

        remainingMutations.shift();
      } catch (error) {
        console.log('[Order] Failed to sync mutation, will retry later:', mutation.recordId, error?.message ?? error);
        break;
      }
    }

    await writePendingMutations(remainingMutations);
  });
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

export const flushPendingMutations = async () => {
  if (pendingSyncPromise) {
    await pendingSyncPromise;
    return;
  }

  await triggerPendingMutationSync();
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

  // console.log('[Order] Saving new exercise', recordId, exercise.name, '-> order =', exercise.order);

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

export const importExerciseRecords = async (exercises) => {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    return [];
  }

  const importedRecords = exercises.map((exercise, index) => {
    const recordId = doc(userCollection('exerciseRecords')).id;
    const nextRecord = createLocalRecord({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      sets: exercise.sets,
      reps: exercise.reps,
      dayOfWeek: exercise.dayOfWeek,
      week: exercise.week,
      weekLabel: exercise.weekLabel ?? `W${Number(exercise.week) || 1}`,
      order: Number.isFinite(Number(exercise.order)) ? Number(exercise.order) : index,
    });

    return {
      id: recordId,
      data: nextRecord,
    };
  });

  await updateCachedRecords('exerciseRecords', (records) => [
    ...records,
    ...importedRecords.map((record) => ({
      id: record.id,
      ...record.data,
    })),
  ]);

  for (const record of importedRecords) {
    await enqueuePendingMutation({
      type: 'set',
      collectionName: 'exerciseRecords',
      recordId: record.id,
      data: record.data,
    });
  }

  triggerPendingMutationSync();

  return importedRecords.map((record) => doc(getDb(), 'users', getCurrentUserId(), 'exerciseRecords', record.id));
};

export const fetchSharedSchedule = async (shareId) => {
  if (!shareId) {
    throw new Error('Missing shared schedule id.');
  }

  const shareSnapshot = await getDoc(doc(getDb(), 'sharedSchedules', shareId));

  if (!shareSnapshot.exists()) {
    const error = new Error('Shared schedule was not found.');
    error.code = 'shared-schedule/not-found';
    throw error;
  }

  return {
    id: shareSnapshot.id,
    ...shareSnapshot.data(),
  };
};

export const updateExerciseRecord = async (recordId, exercise) => {
  const existingRecord = (await readCachedRecords('exerciseRecords')).find((record) => record.id === recordId);
  const nextRecord = createLocalRecord({
    ...exercise,
    createdAt: existingRecord?.createdAt,
    updatedAt: new Date().toISOString(),
  });

  // console.log('[Order] updateExerciseRecord', recordId, exercise.name, '-> order =', exercise.order);

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

export const fetchUserRecords = async (collectionName, options = {}) => {
  if (options.forceRefresh) {
    await flushPendingMutations();
  } else {
    triggerPendingMutationSync();
  }

  const cachedRecords = sortRecords(await readCachedRecords(collectionName), collectionName);

  if (cachedRecords.length > 0 && !options.forceRefresh) {
    return cachedRecords;
  }

  try {
    const serverRecords = await getServerRecords(collectionName);
    await writeCachedRecords(collectionName, serverRecords);

    if (collectionName === 'exerciseRecords') {
      // console.log(
      //   '[Order] Fetched from server:',
      //   sortRecords(serverRecords, collectionName).map((r) => `${r.name}(day=${r.dayOfWeek}, order=${r.order})`)
      // );
    }

    return sortRecords(serverRecords, collectionName);
  } catch (error) {
    return cachedRecords;
  }
};

export const fetchLatestUserRecords = async (collectionName, recordLimit = 5, options = {}) => {
  const records = await fetchUserRecords(collectionName, options);

  return sortRecords(records, collectionName).slice(0, recordLimit);
};