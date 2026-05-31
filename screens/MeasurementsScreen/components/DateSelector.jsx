import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';

const formatDate = (date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const DateSelector = ({ selectedDate, onSelect }) => {
  const [showPicker, setShowPicker] = useState(false);

  const selectedDateKey = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const label = useMemo(() => formatDate(selectedDate), [selectedDate]);

  const handleOpen = () => {
    setShowPicker(true);
  };

  const handleDaySelect = (day) => {
    const pickedDate = new Date(`${day.dateString}T12:00:00`);
    onSelect(pickedDate);
    setShowPicker(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.subtitle}>DATE | Add Measurement Log</Text>

      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Icon name="calendar-month-outline" size={18} color={Theme.colors.textSub} />
        <Text style={styles.triggerText}>{label}</Text>
        <Icon name="chevron-down" size={18} color={Theme.colors.textMuted} />
      </TouchableOpacity>

      {showPicker && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Select Date</Text>

              <Calendar
                current={selectedDateKey}
                maxDate={new Date().toISOString().split('T')[0]}
                onDayPress={handleDaySelect}
                markedDates={{
                  [selectedDateKey]: {
                    selected: true,
                    selectedColor: Theme.colors.primary,
                    selectedTextColor: '#FFFFFF',
                  },
                }}
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
                onPress={() => setShowPicker(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.closeBtnText}>CLOSE</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingBottom: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  subtitle: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
    letterSpacing: 0.3,
  },
  trigger: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.weekInactive,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  triggerText: {
    flex: 1,
    marginLeft: 10,
    color: Theme.colors.text,
    fontSize: Theme.font.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.cardBorder,
    padding: Theme.spacing.md,
  },
  modalTitle: {
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

export default DateSelector;
