// ─── page.jsx (ScheduleScreen) ────────────────────────────────────────────────
// Entry point for the Schedule tab.
// Manages two pieces of state:
//   activeDay  – which day pill is highlighted
//   expanded   – which day card is currently open (only one at a time)
// All UI is delegated to focused sub-components.

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';

import { C }    from './Theme';

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
    const dayKey = DAY_IDS.includes(record.dayOfWeek) ? record.dayOfWeek : 'MON';

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
  const [expandedId, setExpandedId] = useState('MON');   // open accordion card
  const [activeWeek, setActiveWeek] = useState('W1');    // highlighted week pill
  const [weekCards, setWeekCards] = useState({ W1: [], W2: [], W3: [], W4: [] });
  const [editingExercise, setEditingExercise] = useState(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const loadSchedule = async () => {
    try {
      const records = await fetchLatestUserRecords('exerciseRecords', 100);
      const grouped = { W1: [], W2: [], W3: [], W4: [] };

      records.forEach((record) => {
        const weekNumber = Number(record.week) || 1;
        const weekKey = `W${Math.min(Math.max(weekNumber, 1), 4)}`;
        grouped[weekKey].push(record);
      });

      setWeekCards({
        W1: buildWeekCards(grouped.W1),
        W2: buildWeekCards(grouped.W2),
        W3: buildWeekCards(grouped.W3),
        W4: buildWeekCards(grouped.W4),
      });
    } catch (error) {
      console.log('Failed to load schedule data:', error?.message ?? error);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Debug helper: confirm menu press is triggered in runtime
  // (visible in Metro / device logs)
  const debugHandleMenuPress = () => {
    console.log('ScheduleScreen: menu pressed — opening drawer');
    setIsDrawerVisible(true);
  };
  const handleWeekPress     = (id) => setActiveWeek(id);

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
    const resolvedWeek = updatedExercise.week || Number(activeWeek.replace('W', ''));

    await updateExerciseRecord(updatedExercise.id, {
      name: updatedExercise.name,
      muscleGroup: updatedExercise.muscleGroup,
      equipment: updatedExercise.equipment,
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      dayOfWeek: updatedExercise.dayOfWeek,
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

      {/* ① Top bar */}
      <NavHeader
        title="Schedule"
        subtitle="Your workout plan for the week"
        onLeftPress={debugHandleMenuPress}
        
      />

      <TopMenuDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        actions={drawerActions}
      />

      {/* ③ Accordion day cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Week pills included inside ScrollView so there's no extra gap */}
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
    