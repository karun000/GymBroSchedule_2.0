import React from 'react';
import { TouchableOpacity, StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

import HomeScreen from '../screens/HomeScreen/page';
import ScheduleScreen from '../screens/ScheduleScreen/page';
import AddScreen from '../screens/AddScreen/page';
import WeightScreen from '../screens/WeightScreen';
import MeasurementScreen from '../screens/MeasurementScreen';

// ─── Design Tokens (keep in sync with HomeScreen) ────────────────────────────
const C = {
  bg:         '#0C0C1A',
  tabBar:     '#14142A',
  border:     '#22223A',
  purple:     '#7B5CC8',
  gray:       '#6B6B80',
  white:      '#FFFFFF',
};

const TAB_HEIGHT = Platform.OS === 'ios' ? 80 : 68;

const Tab = createBottomTabNavigator();

// ─── Floating centre Add button ───────────────────────────────────────────────
function AddButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.addButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Subtle glow ring */}
      <View style={styles.addButtonGlow} />
      <Icon name="add" size={32} color={C.white} />
    </TouchableOpacity>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: C.purple,
        tabBarInactiveTintColor: C.gray,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
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
        options={{
          tabBarLabel: 'Schedules',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Floating centre Add button ── */}
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => null,
          tabBarButton: (props) => <AddButton {...props} />,
        }}
      />

      <Tab.Screen
        name="Weight"
        component={WeightScreen}
        options={{
          tabBarLabel: 'Weight',
          tabBarIcon: ({ color, size }) => (
            <Icon name="barbell-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Measurements"
        component={MeasurementScreen}
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
  // Tab bar shell
  tabBar: {
    position: 'absolute',
    height: TAB_HEIGHT,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.tabBar,
    // Drop shadow (Android elevation + iOS shadow)
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },

  // Solid bg layer (used by tabBarBackground so the View sits behind items)
  tabBarBg: {
    flex: 1,
    backgroundColor: C.tabBar,
  },

  // Label typography
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // Floating "+" button
  addButton: {
    top: -22,
    left:20,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.purple,
    alignItems: 'center',
    justifyContent: 'center',
    // Halo border
    borderWidth: 3,
    borderColor: C.tabBar,
    // Shadows
    elevation: 10,
    shadowColor: C.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },

  // Soft purple glow ring behind the button (iOS only, elevation handles Android)
  addButtonGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(123, 92, 200, 0.18)',
  },
});