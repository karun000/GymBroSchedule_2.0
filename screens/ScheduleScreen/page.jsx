// ─── page.jsx (ScheduleScreen) ────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Share,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, collection } from 'firebase/firestore';

import { C }    from './Theme';
import { auth, getDb } from '../../FireBase/firebase';

import NavHeader     from '../../components/NavHeader';
import TopMenuDrawer from '../../components/TopMenuDrawer';
import WeekSelector  from './components/Weekselector';
import DayCard       from './components/Daycard';
import ExerciseEditorModal from '../AddScreen/components/ExerciseEditorModal';
import {
  deleteExerciseRecord,
  fetchSharedSchedule,
  fetchUserRecords,
  importExerciseRecords,
  updateExerciseRecord,
} from '../../FireBase/records';
import { extractScheduleImportFromText, buildCompactScheduleUrl } from '../../utils/scheduleShare';

const WEEKS = [
  { id: 'W1', label: 'Week 1' },
  { id: 'W2', label: 'Week 2' },
  { id: 'W3', label: 'Week 3' },
  { id: 'W4', label: 'Week 4' },
  { id: 'W5', label: 'Week 5' },
];

const DAY_IDS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const DAY_ALIASES = Object.entries(DAY_NAMES).reduce((acc, [id, label]) => {
  acc[id] = id;
  acc[label] = id;
  return acc;
}, {});

const STORED_WEEK_KEY = '@plan_active_week';
const STORED_WEEK_DATE_KEY = '@plan_week_calendar_date';

const normalizeDayId = (dayOfWeek) => {
  if (!dayOfWeek) {
    return 'MON';
  }

  const upperValue = String(dayOfWeek).toUpperCase();

  if (DAY_NAMES[upperValue]) {
    return upperValue;
  }

  const matchedEntry = Object.entries(DAY_NAMES).find(([, label]) => label.toUpperCase() === upperValue);

  return matchedEntry?.[0] || DAY_ALIASES[dayOfWeek] || 'MON';
};

const normalizeWeekNumber = (weekValue) => {
  const parsedWeek = Number(weekValue);

  return Number.isFinite(parsedWeek) && parsedWeek > 0 ? parsedWeek : 1;
};

const getTodayDayId = () => DAY_IDS[new Date().getDay()] || 'MON';

const getCalendarWeekTag = () => {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toDateString();
};

const getExerciseTime = (exercise) => {
  const sourceValue = exercise?.createdAt ?? exercise?.updatedAt ?? 0;

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

const getExerciseOrder = (exercise) => {
  const parsedOrder = Number(exercise?.order);

  return Number.isFinite(parsedOrder) ? Math.trunc(parsedOrder) : null;
};

const sortExercisesByOrder = (left, right) => {
  const leftOrder = getExerciseOrder(left);
  const rightOrder = getExerciseOrder(right);

  if (leftOrder !== null && rightOrder !== null) {
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
  } else if (leftOrder !== null || rightOrder !== null) {
    return leftOrder === null ? 1 : -1;
  }

  return getExerciseTime(left) - getExerciseTime(right);
};

const iconForMuscleGroup = (muscleGroup) => {
  const iconMap = {
    Chest: 'dumbbell',
    Back: 'human-handsup',
    Shoulders: 'arm-flex',
    Biceps: 'arm-flex',
    Triceps: 'arm-flex',
    Quads: 'run-fast',
    Hamstrings: 'run-fast',
    Glutes: 'run-fast',
    Core: 'yoga',
    Cardio: 'run',
    'Full Body': 'weight-lifter',
  };

  return iconMap[muscleGroup] || 'dumbbell';
};

const buildWeekCards = (records) => {
  const groupedByDay = DAY_IDS.reduce((acc, dayId) => {
    acc[dayId] = [];
    return acc;
  }, {});

  records.forEach((record) => {
    const dayKey = normalizeDayId(record.dayOfWeek);

    groupedByDay[dayKey].push(record);
  });

  return DAY_IDS.map((dayId) => {
    const exercises = groupedByDay[dayId].sort(sortExercisesByOrder).map((record) => ({
      id: record.id,
      name: record.name,
      sets: record.sets,
      reps: record.reps,
      muscleGroup: record.muscleGroup,
      equipment: record.equipment,
      dayOfWeek: record.dayOfWeek,
      week: record.week,
      order: getExerciseOrder(record),
      icon: iconForMuscleGroup(record.muscleGroup),
    }));

    return {
      id: dayId,
      fullName: DAY_NAMES[dayId],
      type: exercises.length > 0 ? `${exercises.length} Saved Exercise${exercises.length !== 1 ? 's' : ''}` : 'Rest Day',
      isRest: exercises.length === 0,
      exercises,
    };
  });
};

export default function ScheduleScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();

  // ── State ─────────────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState(getTodayDayId());
  const [activeWeek, setActiveWeek] = useState('W1');
  const [weekCards, setWeekCards] = useState({ W1: [], W2: [], W3: [], W4: [], W5: [] });
  const [editingExercise, setEditingExercise] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [allExerciseRecords, setAllExerciseRecords] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isImportVisible, setIsImportVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const loadSchedule = useCallback(async (forceRefresh = false) => {
    try {
      const records = await fetchUserRecords('exerciseRecords', { forceRefresh });
      const sortedRecords = [...records].sort(sortExercisesByOrder);
      setAllExerciseRecords(sortedRecords);

      const grouped = { W1: [], W2: [], W3: [], W4: [], W5: [] };

      sortedRecords.forEach((record) => {
        const weekNumber = normalizeWeekNumber(record.week);
        const weekKey = `W${Math.min(Math.max(weekNumber, 1), 5)}`;
        grouped[weekKey].push(record);
      });

      setWeekCards({
        W1: buildWeekCards(grouped.W1),
        W2: buildWeekCards(grouped.W2),
        W3: buildWeekCards(grouped.W3),
        W4: buildWeekCards(grouped.W4),
        W5: buildWeekCards(grouped.W5),
      });
    } catch (error) {
      console.log('Failed to load schedule data:', error?.message ?? error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadSchedule(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadSchedule]);

  // Sync default week from HomeScreen's AsyncStorage on focus
  useFocusEffect(
    useCallback(() => {
      const loadInitialWeek = async () => {
        try {
          const storedWeek = await AsyncStorage.getItem(STORED_WEEK_KEY);
          if (storedWeek) {
            setActiveWeek(storedWeek);
          } else {
            // Initialize if it doesn't exist to match HomeScreen behavior
            await AsyncStorage.setItem(STORED_WEEK_KEY, 'W1');
            await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
          }
        } catch (e) {
          console.log('Failed to sync active week:', e);
        }
      };
      
      loadInitialWeek();
      loadSchedule();
    }, [loadSchedule])
  );

  // Expand the day card corresponding to today whenever the active week changes
  useEffect(() => {
    setExpandedId(getTodayDayId());
  }, [activeWeek]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const debugHandleMenuPress = () => {
    console.log('ScheduleScreen: menu pressed — opening drawer');
    setIsDrawerVisible(true);
  };

  const handleWeekPress = async (id) => {
    setActiveWeek(id);
    // Persist to AsyncStorage to sync with HomeScreen
    try {
      await AsyncStorage.setItem(STORED_WEEK_KEY, id);
      await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
    } catch (e) {
      console.log('Failed to persist week change:', e);
    }
  };

  const closeImportModal = () => {
    if (isImporting) {
      return;
    }

    setIsImportVisible(false);
    setImportText('');
  };

  // ── Share schedule ───────────────────────────────────────────────────────
  const handleShareSchedule = async () => {
    if (allExerciseRecords.length === 0) {
      Alert.alert('Nothing to share', 'Add some exercises to your schedule first.');
      return;
    }

    setIsSharing(true);

    const exercisesPayload = allExerciseRecords.map((record) => ({
      name: record.name,
      sets: record.sets,
      reps: record.reps,
      muscleGroup: record.muscleGroup,
      equipment: record.equipment,
      dayOfWeek: record.dayOfWeek,
      week: record.week,
      order: getExerciseOrder(record),
    }));
    let shareUrl = null;
    let usingCloudShare = false;

    try {
      const shareRef = doc(collection(getDb(), 'sharedSchedules'));

      await setDoc(shareRef, {
        exercises: exercisesPayload,
        exerciseCount: exercisesPayload.length,
        sharedBy: auth.currentUser?.uid ?? null,
        sharedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'A GymBro user',
        createdAt: new Date().toISOString(),
      });

      shareUrl = `gymbro://import-schedule/${shareRef.id}`;
      usingCloudShare = true;
    } catch (error) {
      console.log('Cloud share unavailable, falling back to inline share:', error?.message ?? error);
      shareUrl = buildCompactScheduleUrl(exercisesPayload);
    }

    try {
      await Share.share({
        message: `Check out my workout schedule on GymBro!\n${shareUrl}`,
        title: 'Share Workout Schedule',
      });
    } catch (error) {
      console.log('Failed to share schedule:', error?.message ?? error);
      Alert.alert('Share failed', 'Could not share your schedule. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleImportSchedule = async () => {
    const scheduleImport = extractScheduleImportFromText(importText);

    if (!scheduleImport) {
      Alert.alert('Import link missing', 'Paste the full GymBro share message or import link.');
      return;
    }

    setIsImporting(true);

    try {
      let exercises = scheduleImport.exercises;

      if (scheduleImport.type === 'cloud') {
        const sharedSchedule = await fetchSharedSchedule(scheduleImport.shareId);
        exercises = sharedSchedule.exercises;
      }

      if (!Array.isArray(exercises) || exercises.length === 0) {
        Alert.alert('Nothing to import', 'This shared schedule does not include any exercises.');
        return;
      }

      const importedRecords = await importExerciseRecords(exercises);
      await loadSchedule();
      setIsImportVisible(false);
      setImportText('');

      Alert.alert(
        'Schedule imported',
        `${importedRecords.length} exercise${importedRecords.length === 1 ? '' : 's'} added to your schedule.`
      );
    } catch (error) {
      console.log('Failed to import pasted schedule:', error?.message ?? error);
      Alert.alert('Import failed', 'Could not import this schedule. Check the link and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const drawerActions = [
    { id: 'home', label: 'My Plan', icon: 'home-outline', onPress: () => navigation.navigate('Home') },
    { id: 'schedule', label: 'Schedules', icon: 'calendar-outline', onPress: () => navigation.navigate('Schedules') },
    { id: 'add', label: 'Add Exercise', icon: 'plus-circle-outline', onPress: () => navigation.navigate('Add') },
    { id: 'pr', label: 'PR Tracker', icon: 'trophy-outline', onPress: () => navigation.navigate('Weight') },
    { id: 'measurements', label: 'Measurements', icon: 'chart-line', onPress: () => navigation.navigate('Measurements') },
  ];

  const handleExerciseMenuPress = (exercise) => {
    setEditingExercise(exercise);
  };

  const handleSaveExerciseEdit = async (updatedExercise) => {
    const resolvedWeek = normalizeWeekNumber(updatedExercise.week || activeWeek.replace('W', ''));
    const resolvedDayOfWeek = normalizeDayId(updatedExercise.dayOfWeek);

    await updateExerciseRecord(updatedExercise.id, {
      name: updatedExercise.name,
      muscleGroup: updatedExercise.muscleGroup,
      equipment: updatedExercise.equipment,
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      dayOfWeek: resolvedDayOfWeek,
      week: resolvedWeek,
      weekLabel: `W${resolvedWeek}`,
      order: getExerciseOrder(updatedExercise),
    });

    setEditingExercise(null);
    await loadSchedule();
  };

  const handleDeleteExercise = async (exerciseId) => {
    await deleteExerciseRecord(exerciseId);

    setEditingExercise(null);
    await loadSchedule();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <NavHeader
        title="Schedule"
        subtitle="Your workout plan for the week"
        onLeftPress={debugHandleMenuPress}
        rightIcon={isSharing ? 'loading' : 'share-variant'}
        onRightPress={handleShareSchedule}
      />

      <TopMenuDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        actions={drawerActions}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purple}
            colors={[C.purple]}
          />
        )}
      >
        <WeekSelector
          weeks={WEEKS}
          activeWeek={activeWeek}
          onWeekPress={handleWeekPress}
          onImportPress={() => setIsImportVisible(true)}
        />

        {(weekCards[activeWeek] || []).map((day) => (
          <DayCard
            key={day.id}
            day={day}
            expanded={expandedId === day.id}
            onToggle={() => handleToggle(day.id)}
            onExOptions={handleExerciseMenuPress}
            style={styles.dayCardSpacing}
          />
        ))}
      </ScrollView>

      <ExerciseEditorModal
        visible={!!editingExercise}
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSave={handleSaveExerciseEdit}
        onDelete={handleDeleteExercise}
      />

      <Modal
        visible={isImportVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImportModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.importModal}>
            <Text style={styles.modalTitle}>Import Schedule</Text>
            <TextInput
              value={importText}
              onChangeText={setImportText}
              placeholder="Paste GymBro share message or link"
              placeholderTextColor={C.gray}
              multiline
              textAlignVertical="top"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.importInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeImportModal}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, isImporting && styles.disabledButton]}
                onPress={handleImportSchedule}
                disabled={isImporting}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>
                  {isImporting ? 'Importing...' : 'Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  dayCardSpacing: {
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    paddingHorizontal: 20,
  },
  importModal: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22223A',
    backgroundColor: '#14142A',
    padding: 18,
  },
  modalTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  importInput: {
    minHeight: 150,
    maxHeight: 240,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22223A',
    backgroundColor: C.bg,
    color: C.white,
    fontSize: 14,
    padding: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: C.gray,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: C.purple,
    paddingHorizontal: 18,
  },
  disabledButton: {
    opacity: 0.65,
  },
  confirmButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
});