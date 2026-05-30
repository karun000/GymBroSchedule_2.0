// ─── components/DaySelector.jsx ──────────────────────────────────────────────
// Horizontal scrollable row of day pills.
// Active day gets a solid purple fill; inactive days get a dark outlined pill.
// Props:
//   days        (array<{id, label}>) – day objects from WEEK
//   activeDay   (string)             – id of the currently selected day
//   onDayPress  (func)               – called with day.id when a pill is tapped

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { C } from '../Theme';

export default function DaySelector({ days, activeDay, onDayPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {days.map((day) => {
        const active = day.id === activeDay;
        return (
          <TouchableOpacity
            key={day.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onDayPress(day.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {day.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 56,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray,
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: C.white,
  },
});