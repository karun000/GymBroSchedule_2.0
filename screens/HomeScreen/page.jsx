// ─── page.jsx (HomeScreen) ────────────────────────────────────────────────────
// Entry point for the Home tab.
// All UI logic is delegated to focused components; this file only composes them.

import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { C }                from './Theme';
import { navigationRef } from '../../navigationRef';

import NavHeader        from '../../components/NavHeader';
import GreetingSection  from './components/GreetingSection';
import DayCard          from '../ScheduleScreen/components/Daycard';
import DaySelector      from '../ScheduleScreen/components/Dayselector';
import WeekSelector     from '../ScheduleScreen/components/Weekselector';
import SavedWeightsCard from './components/Savedweightscard';
import { fetchUserRecords, fetchLatestUserRecords } from '../../FireBase/records';

// ─── Constants ───────────────────────────────────────────────────────────────

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

// AsyncStorage keys used for week auto-advance
const STORED_WEEK_KEY      = '@plan_active_week';
const STORED_WEEK_DATE_KEY = '@plan_week_calendar_date';

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

// ─── Week auto-advance helpers ────────────────────────────────────────────────

const getTodayDayId = () => DAY_LABELS[new Date().getDay()];

/**
 * Returns a stable string that represents the start of the current calendar
 * week (Monday 00:00:00), e.g. "Mon Jun 02 2025".
 * Used to detect when a new real-world week has started.
 */
const getCalendarWeekTag = () => {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay()); // now.getDay() === 0 on Sunday → no rewind needed
  sunday.setHours(0, 0, 0, 0);
  return sunday.toDateString(); // e.g. "Sun Jun 08 2025"
};

/**
 * Reads the persisted active week from AsyncStorage and decides which week to
 * show, following three rules:
 *
 *  1. First launch / stored week is no longer visible → use the first visible week.
 *  2. A new calendar week has begun since the last save  → advance one step,
 *     wrapping back to the first visible week after the last one.
 *  3. Same calendar week as last save → keep the stored selection unchanged.
 *
 * The resolved week ID and today's calendar-week tag are always written back to
 * storage before returning, so subsequent calls within the same week are stable.
 *
 * @param {Array<{id: string, label: string}>} visibleWeeks
 *   Weeks that contain at least one exercise (already filtered).
 * @returns {Promise<string|null>} Resolved week ID, or null when no weeks are visible.
 */
const resolveActiveWeek = async (visibleWeeks) => {
  if (visibleWeeks.length === 0) return null;

  const todayTag = getCalendarWeekTag();

  try {
    const [storedWeek, storedTag] = await Promise.all([
      AsyncStorage.getItem(STORED_WEEK_KEY),
      AsyncStorage.getItem(STORED_WEEK_DATE_KEY),
    ]);

    let activeWeekId;

    if (!storedWeek || !visibleWeeks.some((w) => w.id === storedWeek)) {
      // ① First launch or the stored week no longer exists in the plan.
      activeWeekId = visibleWeeks[0].id;
    } else if (storedTag !== todayTag) {
      // ② A new calendar week has started → advance by one, with wrap-around.
      const currentIndex = visibleWeeks.findIndex((w) => w.id === storedWeek);
      const nextIndex    = (currentIndex + 1) % visibleWeeks.length; // wraps W5 → W1
      activeWeekId       = visibleWeeks[nextIndex].id;
    } else {
      // ③ Same calendar week → honour the persisted selection.
      activeWeekId = storedWeek;
    }

    // Persist the resolved week + today's tag so the next call in the same
    // week returns the same answer without advancing again.
    await Promise.all([
      AsyncStorage.setItem(STORED_WEEK_KEY,      activeWeekId),
      AsyncStorage.setItem(STORED_WEEK_DATE_KEY, todayTag),
    ]);

    return activeWeekId;
  } catch {
    // Storage failure → fall back to the first visible week.
    return visibleWeeks[0].id;
  }
};

// ─── Data-building helpers ────────────────────────────────────────────────────

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
    const leftTime  = Date.parse(left?.createdAt  ?? left?.updatedAt  ?? 0) || 0;
    const rightTime = Date.parse(right?.createdAt ?? right?.updatedAt ?? 0) || 0;
    return leftTime - rightTime;
  });

  sortedRecords.forEach((record) => {
    const weekNumber = Number(record.week) || 1;
    const weekKey    = `W${Math.min(Math.max(weekNumber, 1), 5)}`;
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

/**
 * Derives the list of weeks that have at least one exercise from a fresh
 * weekCards map. Kept as a standalone function so both the state-derived
 * value and the inside-effect computation share the same logic.
 */
const getVisibleWeeks = (cardsByWeek) =>
  HOME_WEEK_IDS
    .map((id) => WEEK_OPTIONS.find((w) => w.id === id))
    .filter((week) => {
      const dayCards = cardsByWeek[week?.id] || {};
      return Object.values(dayCards).some((day) => day?.exercises?.length > 0);
    });

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [weekCards,    setWeekCards]    = useState({});
  const [selectedWeek, setSelectedWeek] = useState('W1');
  const [selectedDay,  setSelectedDay]  = useState(getTodayDayId());
  const [weights,      setWeights]      = useState([]);

  // Derived from state – used for rendering only.
  const visibleWeekOptions = getVisibleWeeks(weekCards);
  const visibleWeekKey     = visibleWeekOptions.map((w) => w.id).join(',');

  // ── Data loader (shared between the mount effect and useFocusEffect) ──────
  const loadHomeData = useCallback(async (isActiveRef) => {
    try {
      const [exerciseRecords, prRecords] = await Promise.all([
        fetchUserRecords('exerciseRecords'),
        fetchLatestUserRecords('prRecords', 3),
      ]);

      if (!isActiveRef.current) return;

      const cardsByWeek = buildWeekCards(exerciseRecords);

      // Compute visible weeks from fresh data (not from stale state) so that
      // resolveActiveWeek always receives an up-to-date list.
      const visible = getVisibleWeeks(cardsByWeek);

      // Determine the correct week, auto-advancing if a new calendar week began.
      const activeWeek = await resolveActiveWeek(visible);

      if (!isActiveRef.current) return;

      setWeekCards(cardsByWeek);
      setWeights(buildWeightPreview(prRecords));
      if (activeWeek) setSelectedWeek(activeWeek);
    } catch (error) {
      console.log('Failed to load home data:', error?.message ?? error);
    }
  }, []);

  // Initial load on mount.
  useEffect(() => {
    const isActiveRef = { current: true };
    loadHomeData(isActiveRef);
    return () => { isActiveRef.current = false; };
  }, [loadHomeData]);

  // Reload (and re-check the week) every time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      const isActiveRef = { current: true };
      loadHomeData(isActiveRef);
      return () => { isActiveRef.current = false; };
    }, [loadHomeData])
  );

  // Safety-net: if visible weeks change (e.g. user edits exercises) and
  // the currently selected week disappears, fall back to the first visible one.
  useEffect(() => {
    if (visibleWeekOptions.length === 0) return;
    if (!visibleWeekOptions.some((w) => w.id === selectedWeek)) {
      setSelectedWeek(visibleWeekOptions[0].id);
    }
  }, [selectedWeek, visibleWeekKey]);

  // Auto-select the best day for the newly active week.
useEffect(() => {
  setSelectedDay(getTodayDayId());
}, [selectedWeek]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Manual week selection by the user.
   * Persists both the chosen week AND today's calendar-week tag so that
   * resolveActiveWeek won't advance again until the next real-world week.
   */
  const handleWeekPress = async (weekId) => {
    setSelectedWeek(weekId);
    try {
      await Promise.all([
        AsyncStorage.setItem(STORED_WEEK_KEY,      weekId),
        AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag()),
      ]);
    } catch {
      // Storage failure is non-fatal; the UI already updated optimistically.
    }
  };

  const handleViewAll     = () => {
    if (navigationRef.isReady()) navigationRef.navigate('Weight');
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
            onWeekPress={handleWeekPress}
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
            <Text style={styles.emptyText}>
              Add an exercise in the Add screen and pick a day to see it here.
            </Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No saved workouts yet</Text>
            <Text style={styles.emptyText}>
              Add exercises to any week to show them here.
            </Text>
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