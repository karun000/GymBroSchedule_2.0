import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Theme from '../Theme';

const WeekSelector = ({ weeks, selectedWeek, exerciseCount, onSelect }) => (
  <View style={styles.wrapper}>
    <Text style={styles.subtitle}>
      Week {selectedWeek} | {exerciseCount} Exercise{exerciseCount !== 1 ? 's' : ''} Added
    </Text>
    <View style={styles.row}>
      {weeks.map((w) => {
        const active = w.id === selectedWeek;
        return (
          <TouchableOpacity
            key={w.id}
            onPress={() => onSelect(w.id)}
            activeOpacity={0.75}
            style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
          >
            <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: Theme.spacing.lg,
  },
  subtitle: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
    fontWeight: '500',
    marginBottom: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
  },
  pillActive: {
    backgroundColor: Theme.colors.weekActive,
  },
  pillInactive: {
    backgroundColor: Theme.colors.weekInactive,
  },
  pillText: {
    fontSize: Theme.font.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: Theme.colors.textMuted,
  },
});

export default WeekSelector;
