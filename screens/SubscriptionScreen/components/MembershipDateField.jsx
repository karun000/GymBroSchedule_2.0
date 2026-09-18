import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';
import { dateInputValue, parseDateInput } from './subscriptionConfig';
import DatePickerModal from './DatePickerModal';

export default function MembershipDateField({ label, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>
      <TextInput accessibilityLabel={`${label}, YYYY-MM-DD`} value={value} onChangeText={onChange} editable={!disabled} placeholder="YYYY-MM-DD" placeholderTextColor={C.gray} style={styles.input} />
      <TouchableOpacity accessibilityLabel={`Choose ${label.toLowerCase()}`} disabled={disabled} onPress={() => setOpen(true)} style={styles.button}>
        <Icon name="calendar-outline" size={22} color={C.purpleSoft} />
      </TouchableOpacity>
    </View>
    <DatePickerModal visible={open} value={parseDateInput(value)} title={label} onCancel={() => setOpen(false)} onConfirm={date => { onChange(dateInputValue(date)); setOpen(false); }} />
  </View>;
}
const styles = StyleSheet.create({
  field: { marginBottom: 16 }, label: { color: C.grayMid, fontSize: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  input: { flex: 1, color: C.white, padding: 12, fontSize: 16 }, button: { padding: 12 },
});
