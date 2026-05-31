import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Theme from '../Theme';

const PRTrackerHeader = () => (
  <View style={styles.container}>
    <Text style={styles.title}>PR TRACKER & WEIGHT LOG</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.lg,
  },
  title: {
    color: Theme.colors.text,
    fontSize: Theme.font.xl,
    fontWeight: '700',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
});

export default PRTrackerHeader;
