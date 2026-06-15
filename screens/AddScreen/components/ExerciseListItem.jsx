import React, { useRef } from 'react';
import { Animated, PanResponder, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';

const ROW_DRAG_DISTANCE = 64;

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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ExerciseListItem = ({
  exercise,
  index,
  itemCount,
  isDragging,
  onDragStart,
  onDragEnd,
  onMenuPress,
}) => {
  const dragState = useRef({ startIndex: index, currentIndex: index });
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  const finishDrag = () => {
    const { startIndex, currentIndex } = dragState.current;

    onDragEnd?.(startIndex, currentIndex);
    dragY.setValue(0);
    Animated.spring(dragScale, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => itemCount > 1,
    onMoveShouldSetPanResponder: (_, gestureState) =>
      itemCount > 1 && Math.abs(gestureState.dy) > 4,
    onPanResponderGrant: () => {
      dragState.current = { startIndex: index, currentIndex: index };
      onDragStart?.(exercise.id);
      Animated.spring(dragScale, {
        toValue: 1.035,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }).start();
    },
    onPanResponderMove: (_, gestureState) => {
      const nextIndex = clamp(
        dragState.current.startIndex + Math.round(gestureState.dy / ROW_DRAG_DISTANCE),
        0,
        itemCount - 1
      );

      dragState.current.currentIndex = nextIndex;
      dragY.setValue(gestureState.dy);
    },
    onPanResponderRelease: finishDrag,
    onPanResponderTerminate: finishDrag,
  });

  return (
    <Animated.View
      style={[
        styles.row,
        isDragging && styles.draggingRow,
        {
          transform: [
            { translateY: dragY },
            { scale: dragScale },
          ],
        },
      ]}
    >
      <View
        style={styles.handle}
        {...panResponder.panHandlers}
      >
        <Icon name="drag-vertical" size={22} color={Theme.colors.textMuted} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>
          {index + 1}. {exercise.name}
        </Text>
        <Text style={styles.sub}>{getSubtitle(exercise)}</Text>
      </View>

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
};

const styles = StyleSheet.create({
  row: {
    position: 'relative',
    zIndex: 0,
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
    paddingVertical: 8,
    paddingRight: 4,
  },
  draggingRow: {
    borderRadius: Theme.radius.md,
    borderBottomColor: 'transparent',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    zIndex: 20,
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
