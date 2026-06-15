// ─── page.jsx (ScheduleScreen) ────────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { doc, setDoc, collection } from 'firebase/firestore';

import { C }    from './Theme';
import { auth, getDb } from '../../FireBase/firebase';

import NavHeader     from '../../components/NavHeader';
import TopMenuDrawer from '../../components/TopMenuDrawer';
import WeekSelector  from './components/Weekselector';
import DayCard       from './components/Daycard';
import ExerciseEditorModal from '../AddScreen/components/ExerciseEditorModal';
import { deleteExerciseRecord, fetchLatestUserRecords, updateExerciseRecord } from '../../FireBase/records';

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

const normalizeDayId = (dayOfWeek) => DAY_ALIASES[dayOfWeek] || 'MON';

const normalizeWeekNumber = (weekValue) => {
  const parsedWeek = Number(weekValue);

  return Number.isFinite(parsedWeek) && parsedWeek > 0 ? parsedWeek : 1;
};

const getTodayDayId = () => DAY_IDS[new Date().getDay()] || 'MON';

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

  const sortedRecords = [...records].sort((left, right) => getExerciseTime(left) - getExerciseTime(right));

  sortedRecords.forEach((record) => {
    const dayKey = normalizeDayId(record.dayOfWeek);

    groupedByDay[dayKey].push(record);
  });

  return DAY_IDS.map((dayId) => {
    const exercises = groupedByDay[dayId].map((record) => ({
      id: record.id,
      name: record.name,
      sets: record.sets,
      reps: record.reps,
      muscleGroup: record.muscleGroup,
      equipment: record.equipment,
      dayOfWeek: record.dayOfWeek,
      week: record.week,
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

  const loadSchedule = useCallback(async () => {
    try {
      const records = await fetchLatestUserRecords('exerciseRecords', 100);
      setAllExerciseRecords(records);

      const sortedRecords = [...records].sort((left, right) => getExerciseTime(left) - getExerciseTime(right));
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

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [loadSchedule])
  );

  useEffect(() => {
    const currentWeekDays = weekCards[activeWeek] || [];
    const todayDay = getTodayDayId();
    const todayHasExercises = currentWeekDays.find((day) => day.id === todayDay)?.exercises?.length > 0;
    const firstAvailableDay = currentWeekDays.find((day) => day?.exercises?.length > 0)?.id;

    if (todayHasExercises) {
      setExpandedId(todayDay);
      return;
    }

    if (firstAvailableDay) {
      setExpandedId(firstAvailableDay);
    }
  }, [activeWeek, weekCards]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const debugHandleMenuPress = () => {
    console.log('ScheduleScreen: menu pressed — opening drawer');
    setIsDrawerVisible(true);
  };
  const handleWeekPress = (id) => setActiveWeek(id);

  // ── Share schedule ───────────────────────────────────────────────────────
  const handleShareSchedule = async () => {
    if (allExerciseRecords.length === 0) {
      Alert.alert('Nothing to share', 'Add some exercises to your schedule first.');
      return;
    }

    setIsSharing(true);

    try {
      const exercisesPayload = allExerciseRecords.map((record) => ({
        name: record.name,
        sets: record.sets,
        reps: record.reps,
        muscleGroup: record.muscleGroup,
        equipment: record.equipment,
        dayOfWeek: record.dayOfWeek,
        week: record.week,
      }));

      const shareRef = doc(collection(getDb(), 'sharedSchedules'));

      await setDoc(shareRef, {
        exercises: exercisesPayload,
        sharedBy: auth.currentUser?.uid ?? null,
        sharedByName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'A GymBro user',
        createdAt: new Date().toISOString(),
      });

      const shareUrl = `gymbro://import-schedule/${shareRef.id}`;

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
      >
        <WeekSelector
          weeks={WEEKS}
          activeWeek={activeWeek}
          onWeekPress={handleWeekPress}
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
});