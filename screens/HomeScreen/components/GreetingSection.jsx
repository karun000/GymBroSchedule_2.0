// ─── components/GreetingSection.jsx ──────────────────────────────────────────
// Displays a personalised greeting and a short motivational line.
// Props:
//   name     (string) – user's first name, default "Alex"
//   subtitle (string) – secondary line, default motivational copy

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C } from '../Theme';

export default function GreetingSection({
  name = 'Karun',
  subtitle = 'Stay consistent and crush your goals.',
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {name}! 💪</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: C.white,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    color: C.gray,
  },
});