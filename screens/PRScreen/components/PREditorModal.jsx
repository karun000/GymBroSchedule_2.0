import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';
import { MUSCLE_GROUPS, UNIT_OPTIONS } from '../PRTrackerData';

const OptionPicker = ({ visible, title, options, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
      <View style={styles.modalBox}>
        <Text style={styles.modalTitle}>{title}</Text>
        {options.map((option) => (
          <TouchableOpacity
            key={String(option)}
            style={styles.modalItem}
            activeOpacity={0.7}
            onPress={() => {
              onSelect(option);
              onClose();
            }}
          >
            <Text style={styles.modalItemText}>{String(option)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

const PREditorModal = ({ visible, pr, onClose, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState('lbs');
  const [repMax, setRepMax] = useState('1');
  const [muscleGroup, setMuscleGroup] = useState('Chest');
  const [dateRange, setDateRange] = useState('Recent');
  const [saving, setSaving] = useState(false);
  const [muscleOpen, setMuscleOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);

  useEffect(() => {
    if (!pr) {
      return;
    }

    setName(pr.name ?? '');
    setWeight(String(pr.weight ?? ''));
    setUnit(pr.unit ?? 'lbs');
    setRepMax(String(pr.repMax ?? 1));
    setMuscleGroup(pr.muscleGroup ?? 'Chest');
    setDateRange(pr.dateRange ?? 'Recent');
  }, [pr, visible]);

  const handleSave = async () => {
    if (!pr?.id || !name.trim()) {
      return;
    }

    try {
      setSaving(true);
      await onSave?.({
        id: pr.id,
        name: name.trim(),
        weight: parseFloat(weight) || 0,
        unit,
        repMax: Number(repMax) || 1,
        muscleGroup,
        dateRange,
      });
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pr?.id) {
      return;
    }

    try {
      setSaving(true);
      await onDelete?.(pr.id);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>Edit PR</Text>

          <Text style={styles.label}>Exercise Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Weight</Text>
          <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />

          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setUnitOpen(true)}>
            <Text style={styles.dropdownText}>{unit}</Text>
            <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>

          <Text style={styles.label}>Rep Max</Text>
          <TextInput style={styles.input} value={repMax} onChangeText={setRepMax} keyboardType="numeric" />

          <Text style={styles.label}>Muscle Group</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setMuscleOpen(true)}>
            <Text style={styles.dropdownText}>{muscleGroup}</Text>
            <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>

          <Text style={styles.label}>Date Range</Text>
          <TextInput style={styles.input} value={dateRange} onChangeText={setDateRange} />

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

      <OptionPicker
        visible={muscleOpen}
        title="Muscle Group"
        options={MUSCLE_GROUPS}
        onSelect={setMuscleGroup}
        onClose={() => setMuscleOpen(false)}
      />
      <OptionPicker
        visible={unitOpen}
        title="Unit"
        options={UNIT_OPTIONS}
        onSelect={setUnit}
        onClose={() => setUnitOpen(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
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

export default PREditorModal;
