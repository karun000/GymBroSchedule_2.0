// ─── components/SavedWeightsCard.jsx ─────────────────────────────────────────
// Card showing the user's latest saved exercise weights.
// Internally renders WeightRow for each exercise.
// Props:
//   weights        (array) – list of weight objects from homeData.js
//   onViewAll      (func)  – "View All" pill press handler
//   onAddExercise  (func)  – "+ Add Exercise" press handler
//   onRowPress     (func)  – individual row chevron press, receives item as arg

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

// ── WeightRow ─────────────────────────────────────────────────────────────────
// Private sub-component — one row per saved exercise.
function WeightRow({ item, last, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={() => onPress?.(item)}
      activeOpacity={0.7}
    >
      {/* Icon bubble */}
      <View style={styles.iconBubble}>
        <Icon name={item.icon} size={20} color={C.grayMid} />
      </View>

      {/* Exercise name + equipment */}
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.equip}>{item.equipment}</Text>
      </View>

      {/* Sets × reps + weight */}
      <View style={styles.meta}>
        <Text style={[styles.sets, { color: item.setsColor }]}>{item.sets}</Text>
        <Text style={styles.weight}>{item.weight}</Text>
      </View>

      <Icon name="chevron-right" size={20} color={C.gray} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ── SavedWeightsCard ──────────────────────────────────────────────────────────
export default function SavedWeightsCard({
  weights = [],
  onViewAll,
  onAddExercise,
  onRowPress,
}) {
  return (
    <View style={styles.card}>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.cardIconBubble}>
            <Icon name="bullseye-arrow" size={20} color={C.purple} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.cardTitle}>Saved Weights</Text>
            <Text style={styles.cardDesc}>Your latest used weights.</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.pill} onPress={onViewAll} activeOpacity={0.75}>
          <Text style={styles.pillText}>View All</Text>
          <Icon name="chevron-right" size={15} color={C.purple} style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* Rows */}
      {weights.map((item, i) => (
        <WeightRow
          key={i}
          item={item}
          last={i === weights.length - 1}
          onPress={onRowPress}
        />
      ))}

      {/* Add Exercise */}
      <TouchableOpacity style={styles.footer} onPress={onAddExercise} activeOpacity={0.7}>
        <Icon name="plus" size={16} color={C.purple} style={{ marginRight: 4 }} />
        <Text style={styles.footerText}>Add Exercise</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card shell
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 4,
    marginBottom: 24,
  },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center' },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: C.white },
  cardDesc:     { fontSize: 12, color: C.gray, marginTop: 2 },

  cardIconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // "View All" pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.purpleDim,
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: { color: C.purple, fontSize: 13, fontWeight: '600' },

  // WeightRow
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info:   { flex: 1 },
  title:  { fontSize: 14, fontWeight: '600', color: C.whiteOff },
  equip:  { fontSize: 12, color: C.gray, marginTop: 2 },
  meta:   { alignItems: 'flex-end' },
  sets:   { fontSize: 13, fontWeight: '700' },
  weight: { fontSize: 12, color: C.gray, marginTop: 2 },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  footerText: {
    color: C.purple,
    fontSize: 14,
    fontWeight: '600',
  },
});