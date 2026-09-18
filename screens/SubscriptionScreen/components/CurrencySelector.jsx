import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { C } from '../Theme';
import { CURRENCIES } from './subscriptionConfig';

export default function CurrencySelector({ value, onChange, disabled }) {
  return <View style={styles.options}>{CURRENCIES.map(currency => (
    <TouchableOpacity key={currency} accessibilityRole="radio" accessibilityState={{ selected: value === currency, disabled }} disabled={disabled} onPress={() => onChange(currency)} style={[styles.option, value === currency && styles.selected]}>
      <Text style={styles.text}>{currency}</Text>
    </TouchableOpacity>
  ))}</View>;
}
const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  option: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  selected: { backgroundColor: C.purple, borderColor: C.purple },
  text: { color: C.white, fontWeight: '600' },
});
