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

const page = ({ navigation }) => {
  const [selectedWeek, setSelectedWeek] = useState(3);
  const [selectedDay, setSelectedDay] = useState('MON');
  const [editingExercise, setEditingExercise] = useState(null);

  const [exercisesByWeek, setExercisesByWeek] = useState({
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  });

  const exercises = exercisesByWeek[selectedWeek] || [];

  const loadExercises = async () => {
    try {
      const storedExercises = await fetchUserRecords('exerciseRecords');

      const groupedExercises = { 1: [], 2: [], 3: [], 4: [], 5: [] };

      storedExercises.forEach((exercise) => {
        const weekKey = Number(exercise.week) || 3;
        const currentWeekExercises = groupedExercises[weekKey] || [];

        groupedExercises[weekKey] = [
          ...currentWeekExercises,
          {
            id: exercise.id,
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment,
            sets: exercise.sets,
            reps: exercise.reps,
            dayOfWeek: exercise.dayOfWeek,
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
      dayOfWeek: newExercise.dayOfWeek || selectedDay,
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
          dayOfWeek: newExercise.dayOfWeek || selectedDay,
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

    await updateExerciseRecord(updatedExercise.id, {
      name: updatedExercise.name,
      muscleGroup: updatedExercise.muscleGroup,
      equipment: updatedExercise.equipment,
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      dayOfWeek: updatedExercise.dayOfWeek,
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
        exerciseCount={exercises.length}
        onSelect={setSelectedWeek}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
            <Text style={styles.sectionTitle}>WEEK {selectedWeek} EXERCISES</Text>
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
    paddingBottom: 40,
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
