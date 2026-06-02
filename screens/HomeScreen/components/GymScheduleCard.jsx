// ─── components/GymScheduleCard.jsx ──────────────────────────────────────────
// Card showing the weekly gym schedule.
// Internally renders ScheduleRow for each day entry.
// Props:
//   schedule      (array)  – list of day objects from homeData.js
//   onNextWeek    (func)   – "View Next Week" press handler
//   onWeekFilter  (func)   – "This Week" pill press handler

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

// ── ScheduleRow ───────────────────────────────────────────────────────────────
// Private sub-component — one row per day of the week.
function ScheduleRow({ item }) {
  const accent = item.done || item.active;

  return (
    <View style={styles.row}>

      {/* Left: coloured bar + day / date */}
      <View style={styles.dayCol}>
        <View style={[styles.dayBar, accent && styles.dayBarActive]} />
        <View style={styles.dayTexts}>
          <Text style={[styles.dayLabel, accent && styles.dayLabelActive]}>
            {item.day}
          </Text>
          <Text style={styles.dateLabel}>{item.date}</Text>
        </View>
      </View>

      {/* Icon bubble */}
      <View style={[styles.workoutBubble, !accent && styles.workoutBubbleDim]}>
        <Icon name={item.icon} size={18} color={accent ? C.purple : C.gray} />
      </View>

      {/* Title + subtitle */}
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutTitle}>{item.title}</Text>
        <Text style={styles.workoutSub}>{item.subtitle}</Text>
      </View>

    </View>
  );
}

// ── GymScheduleCard ───────────────────────────────────────────────────────────
export default function GymScheduleCard({
  schedule = [],
  onNextWeek,
  onWeekFilter,
}) {
  return (
    <View style={styles.card}>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBubble}>
            <Icon name="calendar-month" size={20} color={C.purple} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.cardTitle}>Gym Schedule</Text>
            <Text style={styles.cardDesc}>Plan your training week by week.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pill} onPress={onWeekFilter} activeOpacity={0.75}>
          <Text style={styles.pillText}>This Week</Text>
          <Icon name="chevron-down" size={15} color={C.purple} style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* Rows */}
      {schedule.map((item, i) => (
        <ScheduleRow key={i} item={item} />
      ))}

      {/* Footer */}
      <TouchableOpacity style={styles.footer} onPress={onNextWeek} activeOpacity={0.7}>
        <Text style={styles.footerText}>View Next Week</Text>
        <Icon name="chevron-right" size={16} color={C.purple} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card shell
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 24,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  cardTitle:  { fontSize: 16, fontWeight: '700', color: C.white },
  cardDesc:   { fontSize: 12, color: C.gray, marginTop: 2 },

  // Icon bubble (card header)
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // "This Week" pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.purpleDim,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: { color: C.purple, fontSize: 13, fontWeight: '600' },

  // ScheduleRow
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dayCol:         { flexDirection: 'row', alignItems: 'stretch', width: 58 },
  dayBar:         { width: 3, borderRadius: 2, marginRight: 8, backgroundColor: 'transparent', minHeight: 38 },
  dayBarActive:   { backgroundColor: C.purple },
  dayTexts:       { justifyContent: 'center' },
  dayLabel:       { fontSize: 12, fontWeight: '700', color: C.gray },
  dayLabelActive: { color: C.purple },
  dateLabel:      { fontSize: 11, color: C.gray, marginTop: 2 },

  workoutBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  workoutBubbleDim: { backgroundColor: 'rgba(255,255,255,0.04)' },
  workoutInfo:      { flex: 1 },
  workoutTitle:     { fontSize: 14, fontWeight: '600', color: C.whiteOff },
  workoutSub:       { fontSize: 12, color: C.gray, marginTop: 2 },

  // Footer link
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  footerText: {
    color: C.purple,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
});