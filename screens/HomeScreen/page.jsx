// ─── page.jsx (HomeScreen) ────────────────────────────────────────────────────
// Entry point for the Home tab.
// All UI logic is delegated to focused components; this file only composes them.

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';

import { C }                from './Theme';
import { navigationRef } from '../../navigationRef';

import NavHeader        from '../../components/NavHeader';
import GreetingSection  from './components/GreetingSection';
import DayCard          from '../ScheduleScreen/components/Daycard';
import DaySelector      from '../ScheduleScreen/components/Dayselector';
import WeekSelector     from '../ScheduleScreen/components/Weekselector';
import SavedWeightsCard from './components/Savedweightscard';
import { fetchLatestUserRecords } from '../../FireBase/records';

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const DAY_OPTIONS = DAY_LABELS.map((day) => ({ id: day, label: day }));
const WEEK_OPTIONS = [
  { id: 'W1', label: 'Week 1' },
  { id: 'W2', label: 'Week 2' },
  { id: 'W3', label: 'Week 3' },
  { id: 'W4', label: 'Week 4' },
  { id: 'W5', label: 'Week 5' },
];

const HOME_WEEK_IDS = WEEK_OPTIONS.map((week) => week.id);

const muscleIcons = {
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

const getTodayDayId = () => DAY_LABELS[new Date().getDay()];

const buildDayCards = (records) => {
  const groupedByDay = DAY_LABELS.reduce((acc, dayId) => {
    acc[dayId] = [];
    return acc;
  }, {});

  records.forEach((record) => {
    const dayKey = DAY_LABELS.includes(record.dayOfWeek) ? record.dayOfWeek : 'MON';

    groupedByDay[dayKey].push(record);
  });

  return DAY_LABELS.reduce((acc, dayId) => {
    const exercises = groupedByDay[dayId].map((record) => ({
      id: record.id,
      name: record.name,
      sets: record.sets,
      reps: record.reps,
      icon: muscleIcons[record.muscleGroup] || 'dumbbell',
    }));

    acc[dayId] = {
      id: dayId,
      fullName: DAY_NAMES[dayId],
      type: exercises.length > 0 ? `${exercises.length} Exercise${exercises.length !== 1 ? 's' : ''}` : 'Rest Day',
      isRest: exercises.length === 0,
      exercises,
    };

    return acc;
  }, {});
};

const buildWeekCards = (records) => {
  const groupedByWeek = WEEK_OPTIONS.reduce((acc, week) => {
    acc[week.id] = [];
    return acc;
  }, {});

  const sortedRecords = [...records].sort((left, right) => {
    const leftTime = Date.parse(left?.createdAt ?? left?.updatedAt ?? 0) || 0;
    const rightTime = Date.parse(right?.createdAt ?? right?.updatedAt ?? 0) || 0;

    return leftTime - rightTime;
  });

  sortedRecords.forEach((record) => {
    const weekNumber = Number(record.week) || 1;
    const weekKey = `W${Math.min(Math.max(weekNumber, 1), 5)}`;
    groupedByWeek[weekKey].push(record);
  });

  return WEEK_OPTIONS.reduce((acc, week) => {
    acc[week.id] = buildDayCards(groupedByWeek[week.id]);
    return acc;
  }, {});
};

const buildWeightPreview = (records) =>
  records.map((record, index) => ({
    title: record.name,
    equipment: record.muscleGroup || 'Workout',
    sets: `${record.repMax ?? 1} RM`,
    weight: `${record.weight} ${record.unit || ''}`.trim(),
    icon: record.icon || 'weight-lifter',
    setsColor: index % 2 === 0 ? C.purpleSoft : C.purple,
  }));

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [weekCards, setWeekCards] = useState({});
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [selectedDay, setSelectedDay] = useState(getTodayDayId());
  const [weights, setWeights] = useState([]);

  const visibleWeekOptions = HOME_WEEK_IDS
    .map((weekId) => WEEK_OPTIONS.find((week) => week.id === weekId))
    .filter((week) => {
      const currentWeekCards = weekCards[week?.id] || {};

      return Object.values(currentWeekCards).some((day) => day?.exercises?.length > 0);
    });

  const visibleWeekKey = visibleWeekOptions.map((week) => week.id).join(',');

  useEffect(() => {
    let isActive = true;

    const loadHomeData = async () => {
      try {
        const [exerciseRecords, prRecords] = await Promise.all([
          fetchLatestUserRecords('exerciseRecords', 100),
          fetchLatestUserRecords('prRecords', 3),
        ]);

        if (!isActive) {
          return;
        }

        const cardsByWeek = buildWeekCards(exerciseRecords);
        setWeekCards(cardsByWeek);
        setWeights(buildWeightPreview(prRecords));
      } catch (error) {
        console.log('Failed to load home data:', error?.message ?? error);
      }
    };

    loadHomeData();

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadHomeData = async () => {
        try {
          const [exerciseRecords, prRecords] = await Promise.all([
            fetchLatestUserRecords('exerciseRecords', 100),
            fetchLatestUserRecords('prRecords', 3),
          ]);

          if (!isActive) {
            return;
          }

          const cardsByWeek = buildWeekCards(exerciseRecords);
          setWeekCards(cardsByWeek);
          setWeights(buildWeightPreview(prRecords));
        } catch (error) {
          console.log('Failed to load home data:', error?.message ?? error);
        }
      };

      loadHomeData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    if (visibleWeekOptions.length === 0) {
      return;
    }

    if (!visibleWeekOptions.some((week) => week.id === selectedWeek)) {
      setSelectedWeek(visibleWeekOptions[0].id);
    }
  }, [selectedWeek, visibleWeekKey]);

  useEffect(() => {
    const currentWeekCards = weekCards[selectedWeek] || {};
    const todayDay = getTodayDayId();
    const todayHasExercises = currentWeekCards[todayDay]?.exercises?.length > 0;
    const firstAvailableDay = DAY_LABELS.find((day) => currentWeekCards[day]?.exercises?.length > 0);

    if (todayHasExercises) {
      setSelectedDay(todayDay);
      return;
    }

    if (firstAvailableDay) {
      setSelectedDay(firstAvailableDay);
    }
  }, [selectedWeek, weekCards]);

  // ── Handlers (wire to navigation / state as needed) ──────────────────────
  const handleViewAll     = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Weight');
    }
  };
  const handleAddExercise = () => console.log('Add exercise');
  const handleWeightRow   = (item) => console.log('Weight row pressed:', item.title);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ① Top bar */}
      <NavHeader
        title="My Plan"
        onLeftPress={() => console.log('Menu pressed')}
      />

      {/* ② Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ③ Greeting */}
        <GreetingSection
          name="Alex"
          subtitle="Stay consistent and crush your goals."
        />

        {/* ④ Week + day workout */}
        <View style={styles.sectionLabelRow}>
          <Text style={styles.sectionLabel}>Workout Plan</Text>
        </View>

        {visibleWeekOptions.length > 0 && (
          <WeekSelector
            weeks={visibleWeekOptions}
            activeWeek={selectedWeek}
            onWeekPress={setSelectedWeek}
          />
        )}

        {visibleWeekOptions.length > 0 && (
          <DaySelector
            days={DAY_OPTIONS}
            activeDay={selectedDay}
            onDayPress={setSelectedDay}
          />
        )}

        {visibleWeekOptions.length > 0 && (weekCards[selectedWeek] || {})[selectedDay] ? (
          <DayCard
            day={(weekCards[selectedWeek] || {})[selectedDay]}
            expanded
            onToggle={() => {}}
            onExOptions={(item) => console.log('Options for:', item.name)}
            showExpandIcon={false}
            showMoreIcon={false}
          />
        ) : visibleWeekOptions.length > 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No exercise for this day</Text>
            <Text style={styles.emptyText}>Add an exercise in the Add screen and pick a day to see it here.</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved workouts yet</Text>
            <Text style={styles.emptyText}>Add exercises to any week to show them here.</Text>
          </View>
        )}

        {/* ⑤ Saved weights */}
        <SavedWeightsCard
          weights={weights}
          onViewAll={handleViewAll}
          onAddExercise={handleAddExercise}
          onRowPress={handleWeightRow}
        />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionLabelRow: {
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  emptyTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: C.gray,
    fontSize: 13,
    lineHeight: 18,
  },
});