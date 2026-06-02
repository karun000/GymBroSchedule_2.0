// ─── components/DayCard.jsx ───────────────────────────────────────────────────
// Accordion card for one day of the week.
// Collapsed: shows day name, workout type, exercise count + chevron.
// Expanded:  adds the full ExerciseRow list beneath the header.
// Props:
//   day          ({fullName, type, isRest, exercises}) – day data
//   expanded     (bool)   – controlled from page.jsx
//   onToggle     (func)   – called when header row is tapped
//   onExOptions  (func)   – forwarded to ExerciseRow three-dot handler

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';
import ExerciseRow from './Exerciserow';

export default function DayCard({
  day,
  expanded,
  onToggle,
  onExOptions,
  showExpandIcon = true,
  showMoreIcon = true,
}) {
  const count = day.exercises.length;

  return (
    <View style={styles.card}>

      {/* ── Accordion header ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.75}
      >
        {/* Calendar icon bubble */}
        <View style={styles.iconBubble}>
          <Icon name="calendar-month" size={20} color={C.purple} />
        </View>

        {/* Day name + workout type */}
        <View style={styles.headerInfo}>
          <Text style={styles.dayName}>{day.fullName}</Text>
          <Text style={styles.workoutType}>{day.type}</Text>
        </View>

        {/* Right: exercise count or "Rest" + chevron */}
        <View style={styles.headerRight}>
          {day.isRest ? (
            <Text style={styles.restLabel}>Rest</Text>
          ) : (
            <Text style={styles.countLabel}>{count} Exercises</Text>
          )}
          {showExpandIcon && !day.isRest && (
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={C.grayMid}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* ── Expanded exercise list ── */}
      {expanded && !day.isRest && (
        <View style={styles.exerciseList}>
          {day.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              item={ex}
              last={i === count - 1}
              onOptions={onExOptions}
              showMoreIcon={showMoreIcon}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    marginHorizontal: 10,
  },

  // Header row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  dayName:    { fontSize: 17, fontWeight: '700', color: C.white },
  workoutType:{ fontSize: 13, color: C.purple, marginTop: 2, fontWeight: '500' },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countLabel: {
    fontSize: 13,
    color: C.grayMid,
    fontWeight: '500',
  },
  restLabel: {
    fontSize: 13,
    color: C.gray,
    fontWeight: '500',
  },

  // Exercise list separator
  exerciseList: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
});