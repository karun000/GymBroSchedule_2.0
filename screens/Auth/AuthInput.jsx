import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Theme from './Theme';

const AuthInput = ({
  value,
  onChangeText,
  placeholder,
  iconName,
  secureEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  returnKeyType = 'next',
  onSubmitEditing,
  inputRef,
}) => {
  const [hidden, setHidden] = useState(secureEntry);

  return (
    <View style={styles.wrapper}>
      <Icon
        name={iconName}
        size={18}
        color={Theme.colors.textMuted}
        style={styles.leftIcon}
      />
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Theme.colors.textMuted}
        secureTextEntry={hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
      />
      {secureEntry && (
        <TouchableOpacity
          onPress={() => setHidden((h) => !h)}
          style={styles.eyeBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Theme.colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBg,
    borderWidth: 1.5,
    borderColor: Theme.colors.inputBorder,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    marginBottom: Theme.spacing.md,
  },
  leftIcon: {
    marginRight: Theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: Theme.colors.text,
    fontSize: Theme.font.base,
    padding: 0,
  },
  eyeBtn: {
    marginLeft: Theme.spacing.sm,
  },
});

export default AuthInput;
