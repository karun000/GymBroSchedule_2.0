// ─── components/ExerciseRow.jsx ──────────────────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

export default function ExerciseRow({ item, last, onOptions, showMoreIcon = true, showEquipment = false }) {
  const equipmentText = showEquipment && item?.equipment && String(item.equipment).trim() && String(item.equipment).toLowerCase() !== 'bodyweight'
    ? item.equipment
    : null;

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      {/* Icon placeholder */}
      <View style={styles.thumb}>
        <Icon name={item.icon} size={22} color={C.grayMid} />
      </View>

      {/* Name + sets · reps */}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.sets} sets • {item.reps} reps{equipmentText ? ` • ${equipmentText}` : ''}
        </Text>
      </View>

      {/* Three-dot menu */}
      {showMoreIcon && (
        <TouchableOpacity
          onPress={() => onOptions?.(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Icon name="dots-vertical" size={20} color={C.gray} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,   // ← keeps comfortable row height
    paddingHorizontal: 14,
    // rowSpacing (marginBottom: 8) removed — it was adding 8px on top of
    // paddingVertical: 12 on the next row, creating ~20px of dead space
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: C.whiteOff },
  meta: { fontSize: 13, color: C.gray, marginTop: 3 },
});