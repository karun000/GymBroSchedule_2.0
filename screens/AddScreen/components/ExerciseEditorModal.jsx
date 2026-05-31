import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';
import { DAYS_OF_WEEK, MUSCLE_GROUPS, EQUIPMENT_LIST, REPS_OPTIONS } from '../AddExerciseData';

const PickerModal = ({ visible, title, options, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item.id || item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalItem}
              activeOpacity={0.7}
              onPress={() => {
                onSelect(item.id || item);
                onClose();
              }}
            >
              <Text style={styles.modalItemText}>{item.label || item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const ExerciseEditorModal = ({ visible, exercise, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [equipment, setEquipment] = useState('Dumbbells');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10-12');
  const [dayOfWeek, setDayOfWeek] = useState('MON');
  const [saving, setSaving] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [equipOpen, setEquipOpen] = useState(false);
  const [repsOpen, setRepsOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);

  useEffect(() => {
    if (!exercise) {
      return;
    }

    setName(exercise.name ?? '');
    setMuscleGroup(exercise.muscleGroup ?? 'Chest');
    setEquipment(exercise.equipment ?? 'Dumbbells');
    setSets(String(exercise.sets ?? '3'));
    setReps(String(exercise.reps ?? '10-12'));
    setDayOfWeek(exercise.dayOfWeek ?? 'MON');
  }, [exercise, visible]);

  const handleSave = async () => {
    if (!exercise?.id || !name.trim()) {
      return;
    }

    try {
      setSaving(true);
      await onSave?.({
        id: exercise.id,
        name: name.trim(),
        muscleGroup,
        equipment,
        sets: parseInt(sets, 10) || 3,
        reps,
        dayOfWeek,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!exercise?.id) {
      return;
    }

    try {
      setSaving(true);
      await onDelete?.(exercise.id);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>Edit Exercise</Text>

          <Text style={styles.label}>Exercise Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Muscle Group</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setMuscleOpen(true)}>
            <Text style={styles.dropdownText}>{muscleGroup}</Text>
            <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>

          <Text style={styles.label}>Equipment</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setEquipOpen(true)}>
            <Text style={styles.dropdownText}>{equipment}</Text>
            <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Sets</Text>
              <TextInput style={styles.input} value={sets} onChangeText={setSets} keyboardType="numeric" />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Reps</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setRepsOpen(true)}>
                <Text style={styles.dropdownText}>{reps}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.label}>Day of Week</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setDayOpen(true)}>
            <Text style={styles.dropdownText}>{dayOfWeek}</Text>
            <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.deleteBtn, saving && styles.disabled]}
              onPress={handleDelete}
              disabled={saving}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      <PickerModal visible={muscleOpen} title="Muscle Group" options={MUSCLE_GROUPS} onSelect={setMuscleGroup} onClose={() => setMuscleOpen(false)} />
      <PickerModal visible={equipOpen} title="Equipment" options={EQUIPMENT_LIST} onSelect={setEquipment} onClose={() => setEquipOpen(false)} />
      <PickerModal visible={repsOpen} title="Reps Range" options={REPS_OPTIONS} onSelect={setReps} onClose={() => setRepsOpen(false)} />
      <PickerModal visible={dayOpen} title="Day of Week" options={DAYS_OF_WEEK} onSelect={setDayOfWeek} onClose={() => setDayOpen(false)} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.lg,
  },
  title: {
    color: Theme.colors.text,
    fontSize: Theme.font.lg,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
  },
  label: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  dropdown: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  dropdownText: {
    color: Theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#3a1d1d',
    borderRadius: Theme.radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#ffb4b4',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.lg,
  },
  modalTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    marginBottom: Theme.spacing.md,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  modalItemText: {
    color: Theme.colors.text,
  },
});

export default ExerciseEditorModal;
