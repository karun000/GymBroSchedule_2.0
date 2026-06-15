// ─── components/WeekSelector.jsx ─────────────────────────────────────────────
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { C } from '../Theme';

export default function WeekSelector({ weeks, activeWeek, onWeekPress, onImportPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {weeks.map((w) => {
        const active = w.id === activeWeek;
        return (
          <TouchableOpacity
            key={w.id}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => onWeekPress(w.id)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {onImportPress ? (
        <TouchableOpacity
          style={styles.importPill}
          onPress={onImportPress}
          activeOpacity={0.75}
        >
          <Text style={styles.importText}>Import</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 8,      
  },
  pill: {
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray,
    letterSpacing: 0.3,
  },
  pillTextActive: {
    color: C.white,
  },
  importPill: {
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.purple,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  importText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.purple,
    letterSpacing: 0.3,
  },
});
