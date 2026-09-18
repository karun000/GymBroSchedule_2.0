import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { C } from '../Theme';

export default function GymSubscriptionEmptyState({ onCreate, disabled }) {
  return <View style={styles.card}>
    <Icon name="dumbbell" size={40} color={C.purpleSoft} />
    <Text style={styles.title}>Track your gym membership</Text>
    <Text style={styles.description}>Record what you paid, when you paid, and when your membership ends. Renew the same subscription whenever you need to.</Text>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onCreate} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>Create gym subscription</Text>
    </TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: C.card, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: C.border, gap: 16 },
  title: { color: C.white, fontSize: 22, fontWeight: '700' },
  description: { color: C.grayMid, fontSize: 15, lineHeight: 23 },
  button: { backgroundColor: C.purple, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: C.white, fontWeight: '700' }, disabled: { opacity: 0.5 },
});
