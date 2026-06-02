// ─── components/NavHeader.jsx ─────────────────────────────────────────────────
// Shared top navigation header for screens.

import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DrawerContext } from '../context/DrawerContext';

const DEFAULT_COLORS = {
  white: '#FFFFFF',
  gray: '#6B6B80',
  purple: '#7B5CC8',
};

export default function NavHeader({
  title,
  subtitle,
  onLeftPress,
  leftIcon = 'menu',
  onRightPress,
  rightIcon,
  rightText,
  colors = DEFAULT_COLORS,
}) {
  const { white, gray, purple } = { ...DEFAULT_COLORS, ...colors };
  const drawer = useContext(DrawerContext);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.leftButton}
          onPress={() => {
            // open global drawer, then call provided handler
            if (drawer?.open) drawer.open();
            if (typeof onLeftPress === 'function') onLeftPress();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name={leftIcon} size={26} color={white} />
        </TouchableOpacity>

        {title ? (
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: white }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: gray }]}>{subtitle}</Text>
            ) : null}
          </View>
        ) : null}

        {onRightPress ? (
          <TouchableOpacity
            style={styles.rightButton}
            onPress={onRightPress}
            activeOpacity={0.75}
          >
            {rightIcon ? (
              <Icon name={rightIcon} size={16} color={purple} />
            ) : null}
            {rightText ? (
              <Text style={[styles.rightText, { color: purple }]}>
                {rightText}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.rightSpacer} />
        )}
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 8,
    paddingBottom: 12,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  rightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightText: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightSpacer: {
    width: 34,
  },
  titleRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  leftButton: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
