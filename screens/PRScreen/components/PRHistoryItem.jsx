import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';

const getExerciseIcon = ({ icon, muscleGroup }) => {
  const mg = (muscleGroup || '').toLowerCase();
  if (icon === 'dumbbell') return 'dumbbell';
  if (mg.includes('bodyweight')) return 'arm-flex-outline';
  return 'arm-flex-outline';
};

const PRHistoryItem = ({ pr, index, isLast, onMenuPress }) => (
  <View style={[styles.row, isLast && styles.rowLast]}>
    {/* Trend arrow icon */}
    <View style={styles.arrowWrap}>
      <Icon name="trending-up" size={20} color={Theme.colors.trendArrow} />
    </View>

    {/* Text block */}
    <View style={styles.info}>
      <Text style={styles.name}>
        {index + 1}. {pr.name}
      </Text>
      <Text style={styles.sub}>
        {pr.weight} {pr.unit}, {pr.repMax}RM - [{pr.muscleGroup}]
      </Text>
    </View>

    {/* Right: exercise icon + date range */}
    <View style={styles.right}>
      <Icon name={getExerciseIcon(pr)} size={19} color={Theme.colors.iconMuted} />
      <Text style={styles.dateRange}>{pr.dateRange}</Text>
      <TouchableOpacity
        onPress={() => onMenuPress?.(pr)}
        style={styles.dots}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="dots-vertical" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    marginBottom: 2,
  },
  sub: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
  },
  dateRange: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.xs,
  },
  dots: {
    padding: 2,
  },
});

export default PRHistoryItem;
