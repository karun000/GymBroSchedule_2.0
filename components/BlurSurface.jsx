import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function BlurSurface({
  children,
  style,
  backgroundColor = 'rgba(15, 15, 25, 0.55)',
  borderRadius,
}) {
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor,
          borderRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
