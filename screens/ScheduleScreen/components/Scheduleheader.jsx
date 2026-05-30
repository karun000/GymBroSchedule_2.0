// ─── components/ScheduleHeader.jsx ───────────────────────────────────────────
// Top bar: hamburger menu | "Schedule" + subtitle | "+ New Schedule" button
// Props:
//   onMenuPress      (func) – hamburger press handler
//   onNewSchedule    (func) – "+ New Schedule" press handler

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

export default function ScheduleHeader({ onMenuPress, onNewSchedule }) {
  return (
    <View style={styles.container}>
      {/* Row 1: hamburger + "+ New Schedule" */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="menu" size={26} color={C.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.newBtn}
          onPress={onNewSchedule}
          activeOpacity={0.75}
        >
          <Icon name="plus" size={16} color={C.purple} />
          <Text style={styles.newBtnText}>New Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2: big title + subtitle */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.subtitle}>Your workout plan for the week</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 6,
    paddingBottom: 8,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newBtnText: {
    color: C.purple,
    fontSize: 15,
    fontWeight: '600',
  },
  titleRow: {
    marginTop: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: C.gray,
    marginTop: 3,
  },
});