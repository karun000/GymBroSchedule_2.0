import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';
import { MUSCLE_GROUPS, EQUIPMENT_LIST, REPS_OPTIONS } from '../AddExerciseData';

const DAYS_OF_WEEK = [
  { id: 'MON', label: 'Mon' },
  { id: 'TUE', label: 'Tue' },
  { id: 'WED', label: 'Wed' },
  { id: 'THU', label: 'Thu' },
  { id: 'FRI', label: 'Fri' },
  { id: 'SAT', label: 'Sat' },
  { id: 'SUN', label: 'Sun' },
];

/* ─── Reusable Dropdown Picker Modal ─── */
const PickerModal = ({ visible, title, options, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={modal.overlay} onPress={onClose} activeOpacity={1}>
      <View style={modal.box}>
        <Text style={modal.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={modal.item}
              activeOpacity={0.7}
              onPress={() => { onSelect(item); onClose(); }}
            >
              <Text style={modal.itemText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

/* ─── Main Form ─── */
const CreateExerciseForm = ({ selectedWeek, selectedDay, onDayChange, onAdd }) => {
  const [name, setName]           = useState('Dumbbell Press');
  const [muscle, setMuscle]       = useState('Chest');
  const [equipment, setEquipment] = useState('Dumbbells');
  const [sets, setSets]           = useState('4');
  const [reps, setReps]           = useState('10-12');
  const [saving, setSaving]       = useState(false);

  const [muscleOpen, setMuscleOpen]       = useState(false);
  const [equipOpen, setEquipOpen]         = useState(false);
  const [repsOpen, setRepsOpen]           = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      await onAdd?.({
        name: name.trim(),
        muscleGroup: muscle,
        equipment,
        sets: parseInt(sets, 10) || 3,
        reps,
          dayOfWeek: selectedDay,
      });
      setName('');
    } catch (error) {
      Alert.alert('Save failed', error?.message ?? 'Unable to save this exercise right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>CREATE NEW EXERCISE</Text>

      {/* Exercise Name */}
      <Text style={styles.label}>Exercise Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Bench Press"
        placeholderTextColor={Theme.colors.textMuted}
        returnKeyType="done"
      />

      {/* Muscle Group */}
      <Text style={styles.label}>Muscle Group</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setMuscleOpen(true)} activeOpacity={0.8}>
        <Text style={styles.dropdownText}>{muscle}</Text>
        <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
      </TouchableOpacity>

      <Text style={styles.label}>Day of Week</Text>
      <View style={styles.dayRow}>
        {DAYS_OF_WEEK.map((day) => {
          const active = day.id === selectedDay;

          return (
            <TouchableOpacity
              key={day.id}
              style={[styles.dayPill, active && styles.dayPillActive]}
              onPress={() => onDayChange?.(day.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{day.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Equipment + Sets/Reps row */}
      <View style={styles.twoCol}>
        {/* Equipment */}
        <View style={styles.colEquipment}>
          <Text style={styles.label}>Equipment</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setEquipOpen(true)} activeOpacity={0.8}>
            <Text style={[styles.dropdownText, { flex: 1 }]} numberOfLines={1}>{equipment}</Text>
            <Icon name="chevron-down" size={16} color={Theme.colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* Sets / Reps */}
        <View style={styles.colSetsReps}>
          <Text style={styles.label}>Sets/Reps</Text>
          <View style={styles.setsRepsRow}>
            <TextInput
              style={[styles.input, styles.setsInput]}
              value={sets}
              onChangeText={setSets}
              keyboardType="numeric"
              maxLength={2}
              textAlign="center"
              placeholderTextColor={Theme.colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.dropdown, styles.repsDropdown]}
              onPress={() => setRepsOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownText}>{reps}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={[styles.addBtn, saving && styles.addBtnDisabled]}
        onPress={handleAdd}
        activeOpacity={saving ? 1 : 0.85}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="plus-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.addBtnText}>ADD EXERCISE TO WEEK {selectedWeek}</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Modals */}
      <PickerModal visible={muscleOpen} title="Muscle Group" options={MUSCLE_GROUPS}
        onSelect={setMuscle} onClose={() => setMuscleOpen(false)} />
      <PickerModal visible={equipOpen} title="Equipment" options={EQUIPMENT_LIST}
        onSelect={setEquipment} onClose={() => setEquipOpen(false)} />
      <PickerModal visible={repsOpen} title="Reps Range" options={REPS_OPTIONS}
        onSelect={setReps} onClose={() => setRepsOpen(false)} />
    </View>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  card: {
    marginHorizontal: Theme.spacing.lg,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.lg,
  },
  label: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '500',
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    marginBottom: Theme.spacing.md,
  },
  dropdown: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  dropdownText: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  dayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  dayPill: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  dayPillText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  colEquipment: {
    flex: 1.5,
  },
  colSetsReps: {
    flex: 1.1,
  },
  setsRepsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  setsInput: {
    flex: 0,
    width: 44,
    marginBottom: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
  },
  repsDropdown: {
    flex: 1,
    marginBottom: 0,
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  addBtnDisabled: {
    opacity: 0.75,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: Theme.font.sm,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  box: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    width: '90%',
    maxHeight: 420,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  title: {
    color: Theme.colors.text,
    fontSize: Theme.font.xl,
    fontWeight: '700',
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  item: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  itemText: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
  },
});

export default CreateExerciseForm;