// ─── components/GreetingSection.jsx ──────────────────────────────────────────
// Displays a personalised greeting and a short motivational line.
// Props:
//   name     (string) – user's first name, default "Alex"
//   subtitle (string) – secondary line, default motivational copy

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../FireBase/firebase';
import { C } from '../Theme';

export default function GreetingSection({
  name: propName = 'Karun',
  subtitle = 'Stay consistent and crush your goals.',
}) {
  const [name, setName] = useState(propName);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const display = user.displayName || user.email?.split('@')[0] || propName;
        setName(display);
      } else {
        setName(propName);
      }
    });

    return () => unsubscribe();
  }, [propName]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello, {name}! </Text>
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