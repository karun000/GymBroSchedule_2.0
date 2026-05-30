// ─── page.jsx (HomeScreen) ────────────────────────────────────────────────────
// Entry point for the Home tab.
// All UI logic is delegated to focused components; this file only composes them.

import React from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C }                from './Theme';
import { SCHEDULE, WEIGHTS } from './Homedata';

import NavHeader        from '../../components/NavHeader';
import GreetingSection  from './components/GreetingSection';
import GymScheduleCard  from './components/GymScheduleCard';
import SavedWeightsCard from './components/Savedweightscard';

export default function HomeScreen() {
  // ── Handlers (wire to navigation / state as needed) ──────────────────────
  const handleMenu        = () => console.log('Menu pressed');
  const handleCalendar    = () => console.log('Calendar pressed');
  const handleWeekFilter  = () => console.log('Week filter pressed');
  const handleNextWeek    = () => console.log('View next week');
  const handleViewAll     = () => console.log('View all weights');
  const handleAddExercise = () => console.log('Add exercise');
  const handleWeightRow   = (item) => console.log('Weight row pressed:', item.title);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ① Top bar */}
      <NavHeader
        title="My Plan"
        onLeftPress={handleMenu}
        rightIcon="calendar-month-outline"
        onRightPress={handleCalendar}
      />

      {/* ② Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ③ Greeting */}
        <GreetingSection
          name="Alex"
          subtitle="Stay consistent and crush your goals."
        />

        {/* ④ Weekly gym schedule */}
        <GymScheduleCard
          schedule={SCHEDULE}
          onWeekFilter={handleWeekFilter}
          onNextWeek={handleNextWeek}
        />

        {/* ⑤ Saved weights */}
        <SavedWeightsCard
          weights={WEIGHTS}
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
    paddingBottom: 8,
  },
});