import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';

const getIcon = ({ equipment, muscleGroup }) => {
  const eq = (equipment || '').toLowerCase();
  const mg = (muscleGroup || '').toLowerCase();
  if (eq.includes('barbell') || eq.includes('dumbbell')) return 'dumbbell';
  if (mg === 'bodyweight' || eq === 'bodyweight') return 'arm-flex-outline';
  return 'arm-flex-outline';
};

const getSubtitle = ({ muscleGroup, equipment }) => {
  const parts = [];
  if (muscleGroup) parts.push(muscleGroup);
  if (equipment && equipment.toLowerCase() !== 'bodyweight') parts.push(equipment);
  return parts.join(' | ');
};

const ExerciseListItem = ({ exercise, index, onMenuPress }) => (
  <View style={styles.row}>
    {/* Drag handle (visual only) */}
    <View style={styles.handle}>
      <Icon name="drag-vertical" size={22} color={Theme.colors.textMuted} />
    </View>

    {/* Text */}
    <View style={styles.info}>
      <Text style={styles.name}>
        {index + 1}. {exercise.name}
      </Text>
      <Text style={styles.sub}>{getSubtitle(exercise)}</Text>
    </View>

    {/* Right: exercise icon + dots */}
    <View style={styles.right}>
      <Icon name={getIcon(exercise)} size={20} color={Theme.colors.iconMuted} />
      <TouchableOpacity
        onPress={() => onMenuPress && onMenuPress(exercise.id)}
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
    backgroundColor: Theme.colors.card,
  },
  handle: {
    marginRight: 6,
    opacity: 0.6,
  },
  info: {
    flex: 1,
  },
  name: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '600',
    marginBottom: 2,
  },
  sub: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dots: {
    padding: 2,
  },
});

export default ExerciseListItem;
