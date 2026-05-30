// ─── components/HomeHeader.jsx ────────────────────────────────────────────────
// Top navigation bar: hamburger menu | "My Plan" title | calendar icon

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

export default function HomeHeader({ onMenuPress, onCalendarPress }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onMenuPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="menu" size={26} color={C.white} />
      </TouchableOpacity>

      <Text style={styles.title}>My Plan</Text>

      <TouchableOpacity
        onPress={onCalendarPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="calendar-month-outline" size={26} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.3,
  },
});