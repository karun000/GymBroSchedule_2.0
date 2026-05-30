import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from './Theme';

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

/**
 * ExerciseListItem
 *
 * Props:
 *  - exercise       : exercise object
 *  - index          : current position (0-based), used for the number label
 *  - isDragging     : bool — true while this item is being dragged
 *  - dragHandleProps: spread onto the drag handle (from DraggableList)
 *  - onMenuPress    : called with exercise.id
 */
const ExerciseListItem = ({ exercise, index, isDragging, dragHandleProps, onMenuPress }) => (
  <Animated.View
    style={[
      styles.row,
      isDragging && styles.rowDragging,
    ]}
  >
    {/* Drag handle — receives the pan gesture responder */}
    <View style={styles.handle} {...dragHandleProps}>
      <Icon
        name="drag-vertical"
        size={22}
        color={isDragging ? Theme.colors.primary : Theme.colors.textMuted}
      />
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
  </Animated.View>
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
  rowDragging: {
    backgroundColor: Theme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
    borderRadius: Theme.radius.sm,
    borderBottomWidth: 0,
  },
  handle: {
    marginRight: 6,
    paddingHorizontal: 2,
    paddingVertical: 4,
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
