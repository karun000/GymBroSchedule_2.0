import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Theme from './Theme';
import { WEEKS, INITIAL_WEEK3_EXERCISES } from './AddExerciseData';
import AddExerciseHeader from './AddExerciseHeader';
import WeekSelector from './WeekSelector';
import CreateExerciseForm from './CreateExerciseForm';

const page = ({ navigation }) => {
  const [selectedWeek, setSelectedWeek] = useState(3);

  const [exercisesByWeek, setExercisesByWeek] = useState({
    1: [], 2: [], 3: [...INITIAL_WEEK3_EXERCISES], 4: [], 5: [],
  });

  const exercises = exercisesByWeek[selectedWeek] || [];

  const handleAdd = (newExercise) => {
    setExercisesByWeek((prev) => ({
      ...prev,
      [selectedWeek]: [...(prev[selectedWeek] || []), newExercise],
    }));
  };

  // Called by DraggableList after a successful drag-drop reorder
  const handleReorder = (reorderedExercises) => {
    setExercisesByWeek((prev) => ({
      ...prev,
      [selectedWeek]: reorderedExercises,
    }));
  };

  const handleBack = () => navigation?.goBack();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      {/* Header */}
      <AddExerciseHeader onBack={handleBack} />

      {/* Week Selector */}
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
        // Disable scroll while dragging so the pan gesture wins
        scrollEnabled={true}
      >
        {/* Create New Exercise form */}
        <CreateExerciseForm selectedWeek={selectedWeek} onAdd={handleAdd} />

        {/* Week X Exercises list — drag to reorder */}
        {exercises.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WEEK {selectedWeek} EXERCISES</Text>

            {/*
              DraggableList handles all drag logic internally.
              It re-renders ExerciseListItem with the updated index
              after each reorder, so numbering is always correct.
            */}
            <DraggableList
              exercises={exercises}
              onReorder={handleReorder}
            />
          </View>
        )}
      </ScrollView>
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
});

export default page;