import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';
import { MUSCLE_GROUPS, REP_OPTIONS, UNIT_OPTIONS } from '../PRTrackerData';

const formatDate = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

/* ─── Dropdown picker modal ─── */
const PickerModal = ({ visible, title, options, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={modal.overlay} onPress={onClose} activeOpacity={1}>
      <View style={modal.box}>
        <Text style={modal.title}>{title}</Text>
        <FlatList
          data={options}
          keyExtractor={(item) => String(item)}
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
const NewPRForm = ({ onLog }) => {
  const [exerciseName, setExerciseName] = useState('');
  const [muscleGroup, setMuscleGroup]   = useState('Chest');
  const [maxWeight, setMaxWeight]       = useState('');
  const [unit, setUnit]                 = useState('kg');
  const [repMax, setRepMax]             = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [saving, setSaving] = useState(false);

  const [muscleOpen, setMuscleOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const selectedDateKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

  const handleLog = async () => {
    if (!exerciseName.trim() || !maxWeight) return;
    try {
      setSaving(true);
      await onLog?.({
        name: exerciseName.trim(),
        weight: parseFloat(maxWeight),
        unit,
        repMax,
        muscleGroup,
        dateRange: selectedDate ? formatDate(selectedDate) : 'Recent',
        dateISO: selectedDate ? selectedDate.toISOString() : null,
        icon: 'dumbbell',
      });
      setExerciseName('');
      setMaxWeight('');
      setSelectedDate(null);
      setRepMax(1);
    } catch (error) {
      Alert.alert('Save failed', error?.message ?? 'Unable to save PR right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateSelect = (day) => {
    setSelectedDate(new Date(`${day.dateString}T12:00:00`));
    setDateOpen(false);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>NEW PERSONAL RECORD</Text>

      {/* Exercise Name */}
      <Text style={styles.label}>Exercise Name</Text>
      <TextInput
        style={styles.input}
        value={exerciseName}
        onChangeText={setExerciseName}
        placeholder="e.g. Bench Press"
        placeholderTextColor={Theme.colors.textMuted}
        returnKeyType="done"
      />

      {/* Muscle Group */}
      <Text style={styles.label}>Muscle Group</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setMuscleOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownText}>{muscleGroup}</Text>
        <Icon name="chevron-down" size={18} color={Theme.colors.textSub} />
      </TouchableOpacity>

      {/* Max Weight + Unit */}
      <View style={styles.twoCol}>
        <View style={styles.colWeight}>
          <Text style={styles.label}>Max Weight</Text>
          <TextInput
            style={styles.input}
            value={maxWeight}
            onChangeText={setMaxWeight}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Theme.colors.textMuted}
            returnKeyType="done"
          />
        </View>
        <View style={styles.colUnit}>
          <Text style={styles.label}>Unit</Text>
          <View style={styles.unitToggleRow}>
            {UNIT_OPTIONS.map((u, idx) => {
              const isActive = unit === u;
              return (
                <React.Fragment key={u}>
                  <TouchableOpacity
                    onPress={() => setUnit(u)}
                    activeOpacity={0.8}
                    style={styles.unitBtn}
                  >
                    <Text style={[styles.unitText, isActive && styles.unitTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                  {idx < UNIT_OPTIONS.length - 1 && (
                    <Text style={styles.unitDivider}> / </Text>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </View>

      {/* Rep Max + Date */}
      <View style={styles.twoCol}>
        <View style={styles.colRepMax}>
          <Text style={styles.label}>Rep Max</Text>
          <View style={styles.repPillsRow}>
            {REP_OPTIONS.map((r) => {
              const isActive = repMax === r;
              return (
                <TouchableOpacity
                  key={String(r)}
                  onPress={() => setRepMax(r)}
                  activeOpacity={0.8}
                  style={[styles.repPill, isActive && styles.repPillActive]}
                >
                  <Text style={[styles.repPillText, isActive && styles.repPillTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.colDate}>
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDateOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, !selectedDate && styles.placeholderText]}>
              {selectedDate ? formatDate(selectedDate) : 'Select date'}
            </Text>
            <Icon name="calendar-month-outline" size={18} color={Theme.colors.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Log Button */}
      <TouchableOpacity
        style={[styles.logBtn, saving && styles.logBtnDisabled]}
        onPress={handleLog}
        activeOpacity={saving ? 1 : 0.85}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="plus-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.logBtnText}>LOG NEW PR</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Muscle Group Modal */}
      <PickerModal
        visible={muscleOpen}
        title="Muscle Group"
        options={MUSCLE_GROUPS}
        onSelect={setMuscleGroup}
        onClose={() => setMuscleOpen(false)}
      />

      <Modal
        visible={dateOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateOpen(false)}
      >
        <Pressable style={styles.dateBackdrop} onPress={() => setDateOpen(false)}>
          <Pressable style={styles.dateModalCard} onPress={() => {}}>
            <Text style={styles.dateModalTitle}>Select Date</Text>

            <Calendar
              current={selectedDateKey || new Date().toISOString().split('T')[0]}
              maxDate={new Date().toISOString().split('T')[0]}
              onDayPress={handleDateSelect}
              markedDates={
                selectedDateKey
                  ? {
                      [selectedDateKey]: {
                        selected: true,
                        selectedColor: Theme.colors.primary,
                        selectedTextColor: '#FFFFFF',
                      },
                    }
                  : {}
              }
              enableSwipeMonths
              theme={{
                calendarBackground: Theme.colors.card,
                textSectionTitleColor: Theme.colors.textSub,
                dayTextColor: Theme.colors.text,
                monthTextColor: Theme.colors.text,
                todayTextColor: Theme.colors.primary,
                arrowColor: Theme.colors.primary,
                textDisabledColor: Theme.colors.textMuted,
              }}
              style={styles.calendar}
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setDateOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    flex: 1,
  },
  placeholderText: {
    color: Theme.colors.textMuted,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  colWeight: {
    flex: 1.2,
  },
  colUnit: {
    flex: 1,
    paddingTop: 2,
  },
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    marginBottom: Theme.spacing.md,
  },
  unitBtn: {
    paddingHorizontal: 2,
  },
  unitText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.base,
    fontWeight: '500',
  },
  unitTextActive: {
    color: Theme.colors.text,
    fontWeight: '700',
  },
  unitDivider: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.base,
  },
  colRepMax: {
    flex: 1.4,
  },
  colDate: {
    flex: 1,
  },
  repPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Theme.spacing.md,
    flexWrap: 'wrap',
  },
  repPill: {
    backgroundColor: Theme.colors.repInactive,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
  },
  repPillActive: {
    backgroundColor: Theme.colors.repActive,
    borderColor: Theme.colors.repActive,
  },
  repPillText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.sm,
    fontWeight: '600',
  },
  repPillTextActive: {
    color: '#FFFFFF',
  },
  logBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logBtnDisabled: {
    opacity: 0.75,
  },
  logBtnText: {
    color: '#FFFFFF',
    fontSize: Theme.font.sm,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  dateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  dateModalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.md,
  },
  dateModalTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    marginBottom: Theme.spacing.sm,
    letterSpacing: 0.3,
  },
  calendar: {
    borderRadius: Theme.radius.md,
    overflow: 'hidden',
  },
  closeBtn: {
    marginTop: Theme.spacing.md,
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.weekInactive,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
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

export default NewPRForm;
