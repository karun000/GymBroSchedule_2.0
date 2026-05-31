import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from './Theme';

const SocialButton = ({ iconName, label, onPress, disabled = false }) => (
  <TouchableOpacity
    style={[styles.btn, disabled && styles.btnDisabled]}
    onPress={onPress}
    activeOpacity={disabled ? 1 : 0.8}
    disabled={disabled}
  >
    <Icon name={iconName} size={20} color={Theme.colors.text} style={styles.icon} />
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.googleBtn,
    borderWidth: 1.5,
    borderColor: Theme.colors.googleBtnBorder,
    borderRadius: Theme.radius.md,
    paddingVertical: 13,
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  icon: {},
  label: {
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    fontWeight: '600',
  },
});

export default SocialButton;
