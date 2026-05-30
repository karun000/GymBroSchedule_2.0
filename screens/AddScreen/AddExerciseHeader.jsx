import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from './Theme';

const AddExerciseHeader = ({ onBack }) => (
  <View style={styles.container}>
    <TouchableOpacity onPress={onBack} style={styles.back} activeOpacity={0.7}>
      <Icon name="chevron-left" size={28} color={Theme.colors.text} />
    </TouchableOpacity>
    <Text style={styles.title}>ADD EXERCISE</Text>
    <View style={styles.spacer} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Theme.colors.text,
    fontSize: Theme.font.xl,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  spacer: {
    width: 36,
  },
});

export default AddExerciseHeader;
