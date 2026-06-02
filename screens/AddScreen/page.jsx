import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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

const page = ({ navigation }) => {
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState('SUN');
  const [editingExercise, setEditingExercise] = useState(null);

  const [exercisesByWeek, setExercisesByWeek] = useState({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  const weekExercises = exercisesByWeek[selectedWeek] || [];
  const exercises = weekExercises.filter((exercise) => normalizeDayId(exercise.dayOfWeek) === selectedDay);

  const loadExercises = async () => {
    try {
      const storedExercises = await fetchUserRecords('exerciseRecords');
      const sortedExercises = [...storedExercises].sort((left, right) => getExerciseTime(left) - getExerciseTime(right));

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
  };

  useEffect(() => {
    let isActive = true;

    loadExercises();

    return () => {
      isActive = false;
    };
  }, []);

  const handleAdd = async (newExercise) => {
    const savedExercise = await saveExerciseRecord({
      ...newExercise,
      week: selectedWeek,
      weekLabel: `W${selectedWeek}`,
      dayOfWeek: normalizeDayId(newExercise.dayOfWeek || selectedDay),
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
        },
      ],
    }));
  };

  const handleMenuPress = (exerciseId) => {
    const currentWeekExercises = exercisesByWeek[selectedWeek] || [];
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
    });

    setEditingExercise(null);
    await loadExercises();
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
              {exercises.map((ex, i) => (
                <ExerciseListItem
                  key={ex.id}
                  exercise={ex}
                  index={i}
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
  },
});

export default page;
