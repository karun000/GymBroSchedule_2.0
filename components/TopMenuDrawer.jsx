import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../FireBase/firebase';
import { ThemeContext } from '../context/ThemeContext';

export default function TopMenuDrawer({ visible, onClose }) {
  const { theme, mode } = useContext(ThemeContext);
  const COLORS = theme.colors;
  const [displayName, setDisplayName] = useState('Karun');
  const slideX = useRef(new Animated.Value(-360)).current;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const resolvedName = user?.displayName || user?.email?.split('@')[0] || 'Karun';
      setDisplayName(resolvedName);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    slideX.setValue(-360);
    Animated.timing(slideX, {
      toValue: 0,
      duration: 230,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideX, visible]);

  const handleLogout = async () => {
    onClose?.();
    try {
      await signOut(auth);
    } catch (e) {
      console.log('Sign out failed', e?.message || e);
    }
  };

  const drawerDynamicStyle = {
    backgroundColor: COLORS.bg || COLORS.background || (mode === 'dark' ? '#0C0C1A' : '#FFFFFF'),
    borderRightColor: COLORS.border,
    transform: [{ translateX: slideX }],
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.backdrop} />

          <Animated.View
            pointerEvents="auto"
            style={[
              styles.drawer,
              drawerDynamicStyle,
            ]}
          >
            <View style={[styles.greetingBlock, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
              <Text style={[styles.greetingTitle, { color: COLORS.white }]}>Hello, {displayName}</Text>
              <Text style={[styles.greetingText, { color: COLORS.gray }]}>Ready to lock in today's training?</Text>
            </View>

            <View style={[styles.separator, { backgroundColor: COLORS.border }]} />

            <View style={styles.list}>
              {/* 
                <View style={[styles.actionRowSpace, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}> 
                  <View style={styles.leftActionRow}>
                    <View style={[styles.actionIconWrap, { backgroundColor: COLORS.purple }]}> 
                      <Icon name="theme-light-dark" size={18} color={COLORS.white} />
                    </View>
                    <Text style={[styles.actionLabel, { color: COLORS.white }]}>Theme</Text>
                  </View>
                  <View style={styles.switchWrap}>
                    <Switch
                      value={mode === 'dark'}
                      onValueChange={toggleTheme}
                      trackColor={{ false: '#767577', true: COLORS.purple }}
                      thumbColor={'#fff'}
                    />
                  </View>
                </View> 
              */}

              <TouchableOpacity
                style={[styles.actionRow, styles.logoutRow, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
                activeOpacity={0.85}
                onPress={handleLogout}
              >
                <View style={[styles.actionIconWrap, styles.logoutIconWrap]}>
                  <Icon name="logout" size={18} color={COLORS.white} />
                </View>
                <Text style={[styles.actionLabel, { color: COLORS.white }]}>Logout</Text>
                <Icon name="chevron-right" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '82%',
    maxWidth: 340,
    borderRightWidth: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
    zIndex: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 4, height: 0 },
    elevation: 8,
  },
  greetingBlock: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  actionRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  leftActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchWrap: {
    marginLeft: 12,
  },
  logoutRow: {
    marginTop: 8,
  },
  logoutIconWrap: {
    backgroundColor: '#D9534F',
  },
});