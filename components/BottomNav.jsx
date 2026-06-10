import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ← ADD
import Icon from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen/page';
import ScheduleScreen from '../screens/ScheduleScreen/page';
import AddScreen from '../screens/AddScreen/page';
import PRScreen from '../screens/PRScreen/page';
import MeasurementScreen from '../screens/MeasurementsScreen/page';
import { navigationRef } from '../navigationRef';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     '#0C0C1A',
  tabBar: '#14142A',
  border: '#22223A',
  purple: '#7B5CC8',
  gray:   '#6B6B80',
  white:  '#FFFFFF',
};

const Tab = createBottomTabNavigator();

// ─── Floating centre Add button ───────────────────────────────────────────────
function AddButton({ onPress, isOpen, onClose }) {
  const handleNavigate = (routeName) => {
    onClose();
    if (navigationRef.isReady()) {
      if (routeName === 'Measurements') {
        navigationRef.navigate('Measurements', { openMeasurementModal: true });
        return;
      }
      if (routeName === 'Weight') {
        navigationRef.navigate('Weight', { openPrModal: true });
        return;
      }
      navigationRef.navigate(routeName);
    }
  };

  return (
    <View style={styles.addSlot} pointerEvents="box-none">
      {isOpen ? (
        <View style={styles.addMenu} pointerEvents="box-none">
          <View style={styles.menuArc}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.menuButton, styles.menuButtonTop]}
              onPress={() => handleNavigate('Add')}
            >
              <Icon name="add-circle-outline" size={22} color={C.white} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.menuButton, styles.menuButtonLeft]}
              onPress={() => handleNavigate('Weight')}
            >
              <Icon name="barbell-outline" size={20} color={C.white} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.menuButton, styles.menuButtonRight]}
              onPress={() => handleNavigate('Measurements')}
            >
              <Icon name="analytics-outline" size={20} color={C.white} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.addButtonGlow} />
        <Icon name="add" size={32} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function BottomTabNavigator() {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const insets = useSafeAreaInsets(); // ← ADD

  // Base visible bar height (icons + labels) + safe area inset
  const TAB_HEIGHT = 58 + insets.bottom; // ← DYNAMIC

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.gray,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: {
          ...styles.tabBar,
          height: TAB_HEIGHT,           // ← DYNAMIC HEIGHT
          paddingBottom: insets.bottom, // ← DYNAMIC PADDING
        },
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        listeners={{ tabPress: () => setIsAddMenuOpen(false) }}
        options={{
          tabBarLabel: 'My Plan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Schedules"
        component={ScheduleScreen}
        listeners={{ tabPress: () => setIsAddMenuOpen(false) }}
        options={{
          tabBarLabel: 'Schedules',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Add"
        component={AddScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            setIsAddMenuOpen((current) => !current);
          },
        }}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <AddButton
              {...props}
              isOpen={isAddMenuOpen}
              onClose={() => setIsAddMenuOpen(false)}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Weight"
        component={PRScreen}
        listeners={{ tabPress: () => setIsAddMenuOpen(false) }}
        options={{
          tabBarLabel: 'PR',
          tabBarIcon: ({ color, size }) => (
            <Icon name="barbell-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Measurements"
        component={MeasurementScreen}
        listeners={{ tabPress: () => setIsAddMenuOpen(false) }}
        options={{
          tabBarLabel: 'Measures',
          tabBarIcon: ({ color, size }) => (
            <Icon name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    // height & paddingBottom are now set inline dynamically (see screenOptions)
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.tabBar,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: 'visible',
  },

  tabBarBg: {
    flex: 1,
    backgroundColor: C.tabBar,
    overflow: 'visible',
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  addMenu: {
    position: 'absolute',
    bottom: 62,
    left: '50%',
    marginLeft: -88,
    alignItems: 'center',
    width: 176,
    height: 120,
  },

  menuArc: {
    position: 'relative',
    width: 176,
    height: 120,
  },

  menuButton: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1A1A30',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
  },

  menuButtonTop:   { top: 0,  left: 61, backgroundColor: '#20193A' },
  menuButtonLeft:  { top: 50, left: 12 },
  menuButtonRight: { top: 50, right: 12 },

  addButton: {
    top: -22,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: C.tabBar,
    elevation: 10,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },

  addButtonGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(123, 92, 200, 0.18)',
  },
});