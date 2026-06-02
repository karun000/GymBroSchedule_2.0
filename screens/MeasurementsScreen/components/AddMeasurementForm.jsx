import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from '../Theme';
import { HEIGHT_UNITS, WEIGHT_UNITS, BODY_PART_UNITS, BODY_PARTS, INITIAL_MEASUREMENTS } from '../MeasurementsData';
import UnitDropdown from './UnitDropdown';

/* ─── Single body part input row cell ─── */
const BodyPartInput = ({ label, value, unit, onChangeValue, onChangeUnit }) => (
  <View style={bp.cell}>
    <Text style={bp.label}>{label}</Text>
    <View style={bp.row}>
      <TextInput
        style={bp.input}
        value={value}
        onChangeText={onChangeValue}
        keyboardType="numeric"
        placeholderTextColor={Theme.colors.textMuted}
        returnKeyType="done"
      />
      <UnitDropdown
        value={unit}
        options={BODY_PART_UNITS}
        onChange={onChangeUnit}
      />
    </View>
  </View>
);

/* ─── Main form ─── */
const AddMeasurementForm = ({ selectedDateLabel, onSave, initialMeasurements }) => {
  const [height, setHeight]           = useState(initialMeasurements?.height ?? '102');
  const [heightUnit, setHeightUnit]   = useState(initialMeasurements?.heightUnit ?? 'ft');
  const [weight, setWeight]           = useState(initialMeasurements?.weight ?? '');
  const [weightUnit, setWeightUnit]   = useState(initialMeasurements?.weightUnit ?? 'kg');

  const [bodyParts, setBodyParts] = useState(initialMeasurements?.bodyParts ?? INITIAL_MEASUREMENTS);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!initialMeasurements) {
      return;
    }

    setHeight(initialMeasurements.height ?? '');
    setHeightUnit(initialMeasurements.heightUnit ?? 'cm');
    setWeight(initialMeasurements.weight ?? '');
    setWeightUnit(initialMeasurements.weightUnit ?? 'lbs');
    setBodyParts(initialMeasurements.bodyParts ?? INITIAL_MEASUREMENTS);
  }, [initialMeasurements]);

  const updateBodyPart = (key, field, val) => {
    setBodyParts((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: val },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave?.({ height, heightUnit, weight, weightUnit, bodyParts });
    } catch (error) {
      Alert.alert('Save failed', error?.message ?? 'Unable to save measurements right now.');
    } finally {
      setSaving(false);
    }
  };

  // Pair body parts into 2-column rows
  const pairedParts = [];
  for (let i = 0; i < BODY_PARTS.length; i += 2) {
    pairedParts.push([BODY_PARTS[i], BODY_PARTS[i + 1]]);
  }

  return (
    <View style={styles.card}>
      {/* ── ADD NEW MEASUREMENT ── */}
      <Text style={styles.sectionTitle}>ADD NEW MEASUREMENT</Text>

      {/* Height */}
      <Text style={styles.label}>Height</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
          placeholderTextColor={Theme.colors.textMuted}
          returnKeyType="done"
        />
        <UnitDropdown
          value={heightUnit}
          options={HEIGHT_UNITS}
          onChange={setHeightUnit}
          style={styles.unitFirst}
        />
        {/* Secondary unit label display */}
        <View style={styles.altUnitBox}>
          <Text style={styles.altUnitText}>
            {heightUnit === 'cm' ? 'in' : heightUnit === 'in' ? 'ft' : 'cm'}
          </Text>
        </View>
      </View>

      {/* Weight */}
      <Text style={styles.label}>Weight</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          placeholder=""
          placeholderTextColor={Theme.colors.textMuted}
          returnKeyType="done"
        />
        <UnitDropdown
          value={weightUnit}
          options={WEIGHT_UNITS}
          onChange={setWeightUnit}
          style={styles.weightUnitBtn}
        />
      </View>

      {/* ── BODY PARTS ── */}
      <Text style={[styles.sectionTitle, styles.bodyPartsTitle]}>BODY PARTS</Text>

      {pairedParts.map((pair, rowIdx) => (
        <View key={rowIdx} style={styles.bpRow}>
          {pair.map((part) =>
            part ? (
              <BodyPartInput
                key={part.key}
                label={part.label}
                value={bodyParts[part.key]?.value || ''}
                unit={bodyParts[part.key]?.unit || 'cm'}
                onChangeValue={(v) => updateBodyPart(part.key, 'value', v)}
                onChangeUnit={(u) => updateBodyPart(part.key, 'unit', u)}
              />
            ) : (
              <View key="empty" style={bp.cell} />
            )
          )}
        </View>
      ))}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        activeOpacity={saving ? 1 : 0.85}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="plus-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>SAVE MEASUREMENTS TO {selectedDateLabel}</Text>
          </>
        )}
      </TouchableOpacity>
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
  sectionTitle: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Theme.spacing.md,
  },
  bodyPartsTitle: {
    marginTop: Theme.spacing.md,
  },
  label: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '500',
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  input: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: Theme.colors.text,
    fontSize: Theme.font.base,
  },
  inputFlex: {
    flex: 1,
  },
  unitFirst: {
    // inherits UnitDropdown base style
  },
  altUnitBox: {
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  altUnitText: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.sm,
    fontWeight: '500',
  },
  weightUnitBtn: {
    paddingHorizontal: 10,
  },
  bpRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  saveBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.75,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: Theme.font.sm,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

const bp = StyleSheet.create({
  cell: {
    flex: 1,
    marginBottom: Theme.spacing.md,
  },
  label: {
    color: Theme.colors.textSub,
    fontSize: Theme.font.xs,
    fontWeight: '500',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.sm,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    color: Theme.colors.text,
    fontSize: Theme.font.base,
  },
});

export default AddMeasurementForm;
