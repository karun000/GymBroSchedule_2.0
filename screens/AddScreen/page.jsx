import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from './Theme';
import { WEEKS } from './AddExerciseData';
import WeekSelector from './components/WeekSelector';
import CreateExerciseForm from './components/CreateExerciseForm';
import ExerciseListItem from './components/ExerciseListItem';
import ExerciseEditorModal from './components/ExerciseEditorModal';
import NavHeader from '../../components/NavHeader';
import BlurSurface from '../../components/BlurSurface';
import {
  deleteExerciseRecord,
  fetchUserRecords,
  flushPendingMutations,
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

const DAY_ARRAY = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const STORED_WEEK_KEY = '@plan_active_week';
const STORED_WEEK_DATE_KEY = '@plan_week_calendar_date';

const getTodayDayId = () => DAY_ARRAY[new Date().getDay()];

const getCalendarWeekTag = () => {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return sunday.toDateString();
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

  return Number.isFinite(parsedOrder) ? Math.trunc(parsedOrder) : null;
};

// Fixed sort logic to correctly handle `order === 0`
const sortExercisesByOrder = (left, right) => {
  const leftOrder = getExerciseOrder(left);
  const rightOrder = getExerciseOrder(right);

  if (leftOrder !== null && rightOrder !== null) {
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
  } else if (leftOrder !== null) {
    return -1;
  } else if (rightOrder !== null) {
    return 1;
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
  const [selectedDay, setSelectedDay] = useState(getTodayDayId());
  const [editingExercise, setEditingExercise] = useState(null);
  const [draggingExerciseId, setDraggingExerciseId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

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
  const exercises = useMemo(() => {
    const sorted = weekExercises
      .filter((exercise) => normalizeDayId(exercise.dayOfWeek) === selectedDay)
      .sort(sortExercisesByOrder);

    // console.log(
    //   `[Order] Displayed order for W${selectedWeek}/${selectedDay}:`,
    //   sorted.map((ex) => `${ex.name}(order=${ex.order})`)
    // );

    return sorted;
  }, [selectedDay, selectedWeek, weekExercises]);
  const weekExercisesRef = useRef(weekExercises);
  const latestOrderedExercisesRef = useRef(exercises);

  // Sync default week from HomeScreen's AsyncStorage on mount
  useEffect(() => {
    const loadInitialWeek = async () => {
      try {
        const storedWeek = await AsyncStorage.getItem(STORED_WEEK_KEY);
        if (storedWeek) {
          const weekNum = parseInt(storedWeek.replace('W', ''), 10);
          if (Number.isFinite(weekNum) && weekNum >= 1 && weekNum <= 5) {
            setSelectedWeek(weekNum);
          }
        } else {
          // Initialize if it doesn't exist to match HomeScreen behavior
          await AsyncStorage.setItem(STORED_WEEK_KEY, 'W1');
          await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
        }
      } catch (e) {
        console.log('Failed to load stored week:', e);
      }
    };
    loadInitialWeek();
  }, []);

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

      console.log(
        '[Order] loadExercises grouped (id/day/order):',
        sortedExercises.map((ex) => `${ex.name}[W${ex.week}/${normalizeDayId(ex.dayOfWeek)}]=${getExerciseOrder(ex)}`)
      );

      setExercisesByWeek((prev) => ({
        ...prev,
        ...groupedExercises,
      }));
    } catch (error) {
      console.log('Failed to load saved exercises:', error?.message ?? error);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (hasOrderChanges) {
      Alert.alert(
        'Unsaved Changes',
        'Refreshing will discard your unsaved exercise order. Continue?',
        [
          {
            text: 'Discard & Refresh',
            style: 'destructive',
            onPress: async () => {
              setHasOrderChanges(false);
              setRefreshing(true);
              try {
                await loadExercises(true);
              } finally {
                setRefreshing(false);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setRefreshing(true);

    try {
      await loadExercises(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadExercises, hasOrderChanges]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  useEffect(() => {
    weekExercisesRef.current = weekExercises;
    latestOrderedExercisesRef.current = exercises;
  }, [exercises, weekExercises]);

  const persistExerciseOrder = async (orderedExercises) => {
    console.log(
      '[Order] persistExerciseOrder - about to save:',
      orderedExercises.map((ex, i) => `${ex.name}: ${ex.order} -> ${i}`)
    );

    // Fixed: Update records sequentially to avoid cache race conditions
    for (const [index, exercise] of orderedExercises.entries()) {
      console.log('[Order] Saving', exercise.id, exercise.name, '-> new order =', index);
      await updateExerciseRecord(exercise.id, {
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        sets: exercise.sets,
        reps: exercise.reps,
        dayOfWeek: normalizeDayId(exercise.dayOfWeek),
        week: exercise.week || selectedWeek,
        weekLabel: `W${exercise.week || selectedWeek}`,
        order: index,
      });
    }

    console.log('[Order] persistExerciseOrder - finished saving all records');
  };

  const handleSaveOrder = async () => {
    if (savingOrder) return;

    try {
      setSavingOrder(true);
      await persistExerciseOrder(latestOrderedExercisesRef.current);
      await flushPendingMutations();
      await loadExercises(true);
      setHasOrderChanges(false);
    } catch (error) {
      console.log('Failed to save exercise order:', error?.message ?? error);
      Alert.alert('Order not saved', 'Unable to save the new exercise order right now.');
      await loadExercises(true);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDayChange = (dayId) => {
    if (hasOrderChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved order changes. Do you want to save them before switching days?',
        [
          {
            text: 'Save & Switch',
            onPress: async () => {
              await handleSaveOrder();
              setSelectedDay(dayId);
            },
          },
          {
            text: 'Discard & Switch',
            style: 'destructive',
            onPress: () => {
              setHasOrderChanges(false);
              setSelectedDay(dayId);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    setSelectedDay(dayId);
  };

  const handleWeekChange = async (weekId) => {
    if (hasOrderChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved order changes. Do you want to save them before switching weeks?',
        [
          {
            text: 'Save & Switch',
            onPress: async () => {
              await handleSaveOrder();
              setSelectedWeek(weekId);
              try {
                await AsyncStorage.setItem(STORED_WEEK_KEY, `W${weekId}`);
                await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
              } catch (e) {
                console.log('Failed to persist week change:', e);
              }
            },
          },
          {
            text: 'Discard & Switch',
            style: 'destructive',
            onPress: async () => {
              setHasOrderChanges(false);
              setSelectedWeek(weekId);
              try {
                await AsyncStorage.setItem(STORED_WEEK_KEY, `W${weekId}`);
                await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
              } catch (e) {
                console.log('Failed to persist week change:', e);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setSelectedWeek(weekId);
    try {
      await AsyncStorage.setItem(STORED_WEEK_KEY, `W${weekId}`);
      await AsyncStorage.setItem(STORED_WEEK_DATE_KEY, getCalendarWeekTag());
    } catch (e) {
      console.log('Failed to persist week change:', e);
    }
  };

  const handleAdd = async (newExercise) => {
    if (hasOrderChanges) {
      await handleSaveOrder();
    }

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
    if (hasOrderChanges) {
      await handleSaveOrder();
    }

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

    console.log(
      '[Order] Drag reordered locally:',
      nextDayExercises.map((ex) => `${ex.name}(order=${ex.order})`)
    );

    const nextDayExerciseMap = new Map(nextDayExercises.map((exercise, index) => [exercise.id, { ...exercise, order: index }]));
    const nextWeekExercises = currentWeekExercises.map((exercise) => {
      if (normalizeDayId(exercise.dayOfWeek) !== selectedDay) {
        return exercise;
      }

      const reorderedExercise = nextDayExerciseMap.get(exercise.id);
      return reorderedExercise || exercise;
    });

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
    console.log('[Order] Drag end - fromIndex:', fromIndex, 'toIndex:', toIndex);
    handleExerciseDragMove(fromIndex, toIndex);
    setDraggingExerciseId(null);

    if (fromIndex !== toIndex) {
      setHasOrderChanges(true);
    }
  };

  const handleDeleteExercise = async (exerciseId) => {
    if (hasOrderChanges) {
      await handleSaveOrder();
    }

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
        onSelect={handleWeekChange}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + Theme.spacing.lg + (hasOrderChanges ? 80 : 0) },
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
          onDayChange={handleDayChange}
          onAdd={handleAdd}
        />

        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              WEEK {selectedWeek} - {DAY_LABELS[selectedDay] || selectedDay} EXERCISES
            </Text>
            <View style={styles.listCard}>
              {!!draggingExerciseId && (
                <BlurSurface
                  pointerEvents="none"
                  style={styles.dragBlur}
                  backgroundColor={Theme.colors.card}
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

      {hasOrderChanges && (
        <TouchableOpacity
          style={[styles.fab, { bottom: tabBarHeight + 20 }]}
          onPress={handleSaveOrder}
          disabled={savingOrder}
          activeOpacity={0.85}
        >
          {savingOrder ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="content-save-outline" size={22} color="#fff" />
              <Text style={styles.fabText}>Save Order</Text>
            </>
          )}
        </TouchableOpacity>
      )}

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
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 50,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: Theme.font.base,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default AddExercisePage;