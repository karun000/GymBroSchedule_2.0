// ─── page.jsx (ScheduleScreen) ────────────────────────────────────────────────
// Entry point for the Schedule tab.
// Manages two pieces of state:
//   activeDay  – which day pill is highlighted
//   expanded   – which day card is currently open (only one at a time)
// All UI is delegated to focused sub-components.

import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C }    from './Theme';
import { WEEK } from './ScheduleData';

import NavHeader     from '../../components/NavHeader';
import WeekSelector  from './components/Weekselector';
import DayCard       from './components/Daycard';

export default function ScheduleScreen() {
  // ── State ─────────────────────────────────────────────────────────────────
  const [activeDay,  setActiveDay]  = useState('MON');   // highlighted pill
  const [expandedId, setExpandedId] = useState('MON');   // open accordion card
  const [activeWeek, setActiveWeek] = useState('W1');    // highlighted week pill
  const WEEKS = [
    { id: 'W1', label: 'Week 1' },
    { id: 'W2', label: 'Week 2' },
    { id: 'W3', label: 'Week 3' },
    { id: 'W4', label: 'Week 4' },
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDayPress = (id) => {
    setActiveDay(id);
    // Auto-open the tapped day; close it if already open
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleToggle = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleMenuPress     = () => console.log('Menu pressed');
  const handleNewSchedule   = () => console.log('New schedule');
  const handleExOptions     = (item) => console.log('Options for:', item.name);
  const handleWeekPress     = (id) => setActiveWeek(id);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ① Top bar */}
      <NavHeader
        title="Schedule"
        subtitle="Your workout plan for the week"
        onLeftPress={handleMenuPress}
        rightIcon="plus"
        rightText="New Schedule"
        onRightPress={handleNewSchedule}
      />

      {/* ③ Accordion day cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week pills included inside ScrollView so there's no extra gap */}
        <WeekSelector
          weeks={WEEKS}
          activeWeek={activeWeek}
          onWeekPress={handleWeekPress}
        />

        {WEEK.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            expanded={expandedId === day.id}
            onToggle={() => handleToggle(day.id)}
            onExOptions={handleExOptions}
            style={{ marginTop: 12 }}   
          />
        ))}
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
    paddingTop: 0,
  },

});
    