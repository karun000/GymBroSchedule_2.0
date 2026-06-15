import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from '@react-native-community/blur';
import Theme from './Theme';
import { WEEKS } from './AddExerciseData';
import WeekSelector from './components/WeekSelector';
import CreateExerciseForm from './components/CreateExerciseForm';
import ExerciseListItem from './components/ExerciseListItem';
import ExerciseEditorModal from './components/ExerciseEditorModal';
import NavHeader from '../../components/NavHeader';
import {
  deleteExerciseRecord,
  fetchUserRecords,
  saveExerciseRecord,
  updateExerciseRecord,
} from '../../FireBase/records';

const DAY_LABELS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

const normalizeDayId = (dayOfWeek) => {
  if (!dayOfWeek) {
    return 'MON';
  }

  const upperValue = String(dayOfWeek).toUpperCase();

  if (DAY_LABELS[upperValue]) {
    return upperValue;
  }

  const matchedEntry = Object.entries(DAY_LABELS).find(([, label]) => label.toUpperCase() === upperValue);

  return matchedEntry?.[0] || 'MON';
};

const getExerciseTime = (exercise) => {
  const sourceValue = exercise?.createdAt ?? exercise?.updatedAt ?? 0;

  if (typeof sourceValue === 'number') {
    return sourceValue;
  }

  if (typeof sourceValue === 'string') {
    const parsedTime = Date.parse(sourceValue);

    return Number.isFinite(parsedTime) ? parsedTime : 0;
  }

  if (sourceValue && typeof sourceValue.toDate === 'function') {
    return sourceValue.toDate().getTime();
  }

  return 0;
};

const getExerciseOrder = (exercise) => {
  const parsedOrder = Number(exercise?.order);

  return Number.isFinite(parsedOrder) ? parsedOrder : null;
};

const sortExercisesByOrder = (left, right) => {
  const leftOrder = getExerciseOrder(left);
  const rightOrder = getExerciseOrder(right);

  if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return getExerciseTime(left) - getExerciseTime(right);
};

const reorderItems = (items, fromIndex, toIndex) => {
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);

  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const AddExercisePage = () => {
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState('SUN');
  const [editingExercise, setEditingExercise] = useState(null);
  const [draggingExerciseId, setDraggingExerciseId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [exercisesByWeek, setExercisesByWeek] = useState({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  const weekExercises = useMemo(
    () => exercisesByWeek[selectedWeek] || [],
    [exercisesByWeek, selectedWeek]
  );
  const exercises = useMemo(
    () => weekExercises
      .filter((exercise) => normalizeDayId(exercise.dayOfWeek) === selectedDay)
      .sort(sortExercisesByOrder),
    [selectedDay, weekExercises]
  );
  const weekExercisesRef = useRef(weekExercises);
  const latestOrderedExercisesRef = useRef(exercises);

  const loadExercises = useCallback(async (forceRefresh = false) => {
    try {
      const storedExercises = await fetchUserRecords('exerciseRecords', { forceRefresh });
      const sortedExercises = [...storedExercises].sort(sortExercisesByOrder);

      const groupedExercises = { 1: [], 2: [], 3: [], 4: [], 5: [] };

      sortedExercises.forEach((exercise) => {
        const weekKey = Math.min(Math.max(Number(exercise.week) || 1, 1), 5);
        const currentWeekExercises = groupedExercises[weekKey] || [];
        const normalizedDay = normalizeDayId(exercise.dayOfWeek);

        groupedExercises[weekKey] = [
          ...currentWeekExercises,
          {
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment,
            sets: exercise.sets,
            reps: exercise.reps,
            dayOfWeek: normalizedDay,
            week: exercise.week,
            weekLabel: exercise.weekLabel,
            order: getExerciseOrder(exercise),
          },
        ];
      });

      setExercisesByWeek((prev) => ({
        ...prev,
        ...groupedExercises,
      }));
    } catch (error) {
      console.log('Failed to load saved exercises:', error?.message ?? error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadExercises(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadExercises]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    weekExercisesRef.current = weekExercises;
    latestOrderedExercisesRef.current = exercises;
  }, [exercises, weekExercises]);

  const handleAdd = async (newExercise) => {
    const highestOrder = exercises.reduce((maxOrder, exercise) => {
      const order = getExerciseOrder(exercise);

      return order === null ? maxOrder : Math.max(maxOrder, order);
    }, -1);
    const nextOrder = highestOrder + 1;
    const savedExercise = await saveExerciseRecord({
      ...newExercise,
      week: selectedWeek,
      weekLabel: `W${selectedWeek}`,
      dayOfWeek: normalizeDayId(newExercise.dayOfWeek || selectedDay),
      order: nextOrder,
    });

    setExercisesByWeek((prev) => ({
      ...prev,
      [selectedWeek]: [
        ...(prev[selectedWeek] || []),
        {
          id: savedExercise.id,
          ...newExercise,
          week: selectedWeek,
          weekLabel: `W${selectedWeek}`,
          dayOfWeek: normalizeDayId(newExercise.dayOfWeek || selectedDay),
          order: nextOrder,
        },
      ],
    }));
  };

  const handleMenuPress = (exerciseId) => {
    const currentWeekExercises = weekExercisesRef.current || [];
    const matchedExercise = currentWeekExercises.find((exercise) => exercise.id === exerciseId);

    if (matchedExercise) {
      setEditingExercise(matchedExercise);
    }
  };

  const handleSaveExerciseEdit = async (updatedExercise) => {
    const resolvedWeek = updatedExercise.week || selectedWeek;
    const resolvedDay = normalizeDayId(updatedExercise.dayOfWeek);

    await updateExerciseRecord(updatedExercise.id, {
      name: updatedExercise.name,
      muscleGroup: updatedExercise.muscleGroup,
      equipment: updatedExercise.equipment,
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      dayOfWeek: resolvedDay,
      week: resolvedWeek,
      weekLabel: `W${resolvedWeek}`,
      order: getExerciseOrder(updatedExercise),
    });

    setEditingExercise(null);
    await loadExercises();
  };

  const persistExerciseOrder = async (orderedExercises) => {
    await Promise.all(
      orderedExercises.map((exercise, index) =>
        updateExerciseRecord(exercise.id, {
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          equipment: exercise.equipment,
          sets: exercise.sets,
          reps: exercise.reps,
          dayOfWeek: normalizeDayId(exercise.dayOfWeek),
          week: exercise.week || selectedWeek,
          weekLabel: `W${exercise.week || selectedWeek}`,
          order: index,
        })
      )
    );
  };

  const handleExerciseDragMove = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) {
      return latestOrderedExercisesRef.current;
    }

    const currentWeekExercises = weekExercisesRef.current || [];
    const dayExercises = currentWeekExercises
      .filter((exercise) => normalizeDayId(exercise.dayOfWeek) === selectedDay)
      .sort(sortExercisesByOrder);
    const nextDayExercises = reorderItems(dayExercises, fromIndex, toIndex).map((exercise, index) => ({
      ...exercise,
      order: index,
    }));
    const reorderedIds = new Set(nextDayExercises.map((exercise) => exercise.id));
    const nextWeekExercises = [
      ...currentWeekExercises.filter((exercise) => !reorderedIds.has(exercise.id)),
      ...nextDayExercises,
    ].sort(sortExercisesByOrder);

    latestOrderedExercisesRef.current = nextDayExercises;
    weekExercisesRef.current = nextWeekExercises;

    setExercisesByWeek((prev) => ({
      ...prev,
      [selectedWeek]: nextWeekExercises,
    }));

    return nextDayExercises;
  };

  const handleExerciseDragStart = (exerciseId) => {
    setDraggingExerciseId(exerciseId);
  };

  const handleExerciseDragEnd = async (fromIndex, toIndex) => {
    const nextOrderedExercises = handleExerciseDragMove(fromIndex, toIndex);

    setDraggingExerciseId(null);

    try {
      if (fromIndex !== toIndex) {
        await persistExerciseOrder(nextOrderedExercises);
      }
    } catch (error) {
      console.log('Failed to save exercise order:', error?.message ?? error);
      Alert.alert('Order not saved', 'Unable to save the new exercise order right now.');
      await loadExercises();
    }
  };

  const handleDeleteExercise = async (exerciseId) => {
    await deleteExerciseRecord(exerciseId);

    setEditingExercise(null);
    await loadExercises();
  };

  const handleMenu = () => console.log('Menu pressed');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      <NavHeader title="Add Exercise" onLeftPress={handleMenu} rightIcon="calendar-month-outline" />

      <WeekSelector
        weeks={WEEKS}
        selectedWeek={selectedWeek}
        exerciseCount={weekExercises.length}
        onSelect={setSelectedWeek}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + Theme.spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!draggingExerciseId}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        )}
      >
        <CreateExerciseForm
          selectedWeek={selectedWeek}
          selectedDay={selectedDay}
          onDayChange={setSelectedDay}
          onAdd={handleAdd}
        />

        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              WEEK {selectedWeek} - {DAY_LABELS[selectedDay] || selectedDay} EXERCISES
            </Text>
            <View style={styles.listCard}>
              {!!draggingExerciseId && (
                <BlurView
                  pointerEvents="none"
                  style={styles.dragBlur}
                  blurType="dark"
                  blurAmount={8}
                  reducedTransparencyFallbackColor={Theme.colors.card}
                />
              )}
              {exercises.map((ex, i) => (
                <ExerciseListItem
                  key={ex.id}
                  exercise={ex}
                  index={i}
                  itemCount={exercises.length}
                  isDragging={draggingExerciseId === ex.id}
                  onDragStart={handleExerciseDragStart}
                  onDragEnd={handleExerciseDragEnd}
                  onMenuPress={handleMenuPress}
                />
              ))}
            </View>
          </View>
        )}

        {weekExercises.length > 0 && exercises.length === 0 && (
          <View style={styles.section}>
            <Text style={styles.emptyTitle}>No exercises for {DAY_LABELS[selectedDay] || selectedDay}</Text>
            <Text style={styles.emptyText}>Select another day or add an exercise for the current day.</Text>
          </View>
        )}
      </ScrollView>

      <ExerciseEditorModal
        visible={!!editingExercise}
        exercise={editingExercise}
        onClose={() => setEditingExercise(null)}
        onSave={handleSaveExerciseEdit}
        onDelete={handleDeleteExercise}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
  },
  section: {
    marginHorizontal: Theme.spacing.lg,
  },
  sectionTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.md,
  },
  listCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  dragBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export default AddExercisePage;
