// ─── components/DatePickerModal.jsx ───────────────────────────────────────
// Self-contained calendar picker (no external dependencies).

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';
import { MONTH_NAMES, WEEKDAY_LETTERS, startOfDay } from './subscriptionConfig';

const DatePickerModal = ({ visible, value, minimumDate, title = 'Select date', onCancel, onConfirm }) => {
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const base = startOfDay(value ?? new Date());
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setSelected(base);
  }, [visible, value]);

  const today = startOfDay(new Date());
  const minTime = minimumDate ? startOfDay(minimumDate).getTime() : null;

  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const list = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(new Date(viewYear, viewMonth, day));
    }
    return list;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    const date = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const goNextMonth = () => {
    const date = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const isDisabled = (date) => minTime !== null && date.getTime() < minTime;
  const isSelected = (date) => selected && date.getTime() === selected.getTime();
  const isToday = (date) => date.getTime() === today.getTime();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.monthArrow} onPress={goPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="chevron-left" size={22} color={C.purpleSoft} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={styles.monthArrow} onPress={goNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="chevron-right" size={22} color={C.purpleSoft} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LETTERS.map((letter, index) => (
              <Text key={`${letter}-${index}`} style={styles.weekdayLetter}>{letter}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
              const disabled = isDisabled(date);
              const selectedDay = isSelected(date);
              const todayDay = isToday(date);

              return (
                <View key={date.toISOString()} style={styles.dayCell}>
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => setSelected(date)}
                    style={[
                      styles.dayButton,
                      selectedDay && styles.dayButtonSelected,
                      !selectedDay && todayDay && styles.dayButtonToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDay && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.todayButton}
              disabled={minTime !== null && today.getTime() < minTime}
              onPress={() => {
                setSelected(today);
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
            >
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostButton} onPress={onCancel}>
              <Text style={styles.ghostText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.solidButton, !selected && styles.solidButtonDisabled]}
              disabled={!selected}
              onPress={() => selected && onConfirm(selected)}
            >
              <Text style={styles.solidText}>OK</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  title: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthArrow: {
    padding: 4,
  },
  monthLabel: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLetter: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: C.gray,
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayButtonSelected: {
    backgroundColor: C.purple,
  },
  dayButtonToday: {
    borderColor: C.purple,
  },
  dayText: {
    color: C.white,
    fontSize: 13,
  },
  dayTextSelected: {
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: C.gray,
    opacity: 0.35,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  todayButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  todayText: {
    color: C.purpleSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  ghostButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  ghostText: {
    color: C.gray,
    fontSize: 14,
    fontWeight: '600',
  },
  solidButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.purple,
  },
  solidButtonDisabled: {
    opacity: 0.4,
  },
  solidText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default DatePickerModal;