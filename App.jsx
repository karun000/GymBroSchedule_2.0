import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './FireBase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabNavigator from './components/BottomNav';
import { navigationRef } from './navigationRef';
import ThemeProvider from './context/ThemeContext';
import DrawerProvider, { DrawerContext } from './context/DrawerContext';
import TopMenuDrawer from './components/TopMenuDrawer';
import SignInScreen from './screens/Auth/page';
import SignUpScreen from './screens/Auth/SignUpScreen';
import Theme from './screens/Auth/Theme';
import { fetchSharedSchedule, importExerciseRecords } from './FireBase/records';
import { extractScheduleImportFromText } from './utils/scheduleShare';
import {
  APP_OPEN_LAST_NOTIFIED_KEY,
  APP_OPEN_LAST_OPENED_KEY,
  getLocalDateKey,
  shouldSendDailyReminder,
} from './utils/appOpenReminder';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [authMode, setAuthMode] = useState('signin');
  const pendingImportUrlRef = useRef(null);
  const importedShareIdsRef = useRef(new Set());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ?? null);
    });
    return unsubscribe;
  }, []);

  const handleAppOpenReminder = useCallback(async () => {
    if (!auth.currentUser) {
      return;
    }

    const now = new Date();
    const lastOpenedAt = await AsyncStorage.getItem(APP_OPEN_LAST_OPENED_KEY);
    const lastNotifiedForDay = await AsyncStorage.getItem(APP_OPEN_LAST_NOTIFIED_KEY);

    const shouldNotify = shouldSendDailyReminder({
      lastOpenedAt,
      now,
      lastNotifiedForDay,
    });

    await AsyncStorage.setItem(APP_OPEN_LAST_OPENED_KEY, now.toISOString());

    if (shouldNotify) {
      Alert.alert(
        'GymBro reminder',
        'You have not opened the app yet today. Time to check your schedule and stay consistent.'
      );
      await AsyncStorage.setItem(APP_OPEN_LAST_NOTIFIED_KEY, getLocalDateKey(now));
    }
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    handleAppOpenReminder();

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        handleAppOpenReminder();
      }
    });

    return () => appStateSubscription?.remove?.();
  }, [handleAppOpenReminder, user]);

  const importExercisesFromSchedule = useCallback(async (exercises, importKey) => {
    if (!Array.isArray(exercises) || exercises.length === 0) {
      Alert.alert('Nothing to import', 'This shared schedule does not include any exercises.');
      return;
    }

    if (importedShareIdsRef.current.has(importKey)) {
      return;
    }

    importedShareIdsRef.current.add(importKey);

    try {
      await importExerciseRecords(exercises);

      Alert.alert(
        'Schedule imported',
        `${exercises.length} exercise${exercises.length === 1 ? '' : 's'} added to your schedule.`
      );

      if (navigationRef.isReady()) {
        navigationRef.navigate('Schedules');
      }
    } catch (error) {
      importedShareIdsRef.current.delete(importKey);
      console.log('Failed to import shared schedule:', error?.message ?? error);
      Alert.alert('Import failed', 'Could not import this shared schedule. Please try again.');
    }
  }, []);

  const importSharedSchedule = useCallback(async (shareId) => {
    if (!shareId) {
      return;
    }

    if (importedShareIdsRef.current.has(shareId)) {
      return;
    }

    importedShareIdsRef.current.add(shareId);

    try {
      const sharedSchedule = await fetchSharedSchedule(shareId);
      const exercises = Array.isArray(sharedSchedule.exercises) ? sharedSchedule.exercises : [];

      importedShareIdsRef.current.delete(shareId);
      await importExercisesFromSchedule(exercises, shareId);
    } catch (error) {
      importedShareIdsRef.current.delete(shareId);
      console.log('Failed to import shared schedule:', error?.message ?? error);
      Alert.alert('Import failed', 'Could not import this shared schedule. Please try again.');
    }
  }, [importExercisesFromSchedule]);


  const handleIncomingUrl = useCallback((url) => {
    const scheduleImport = extractScheduleImportFromText(url);

    if (!scheduleImport) {
      return;
    }

    if (!auth.currentUser) {
      pendingImportUrlRef.current = url;
      Alert.alert('Sign in to import', 'Sign in first, then GymBro will import this shared schedule.');
      return;
    }

    if (scheduleImport.type === 'inline') {
      importExercisesFromSchedule(
        scheduleImport.exercises,
        `inline:${url.length}:${url.slice(-32)}`
      );
      return;
    }

    importSharedSchedule(scheduleImport.shareId);
  }, [importExercisesFromSchedule, importSharedSchedule]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url);
    });

    return () => subscription.remove();
  }, [handleIncomingUrl]);

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    Linking.getInitialURL().then(handleIncomingUrl).catch(() => {});
  }, [handleIncomingUrl, user]);

  useEffect(() => {
    if (user && pendingImportUrlRef.current) {
      const pendingUrl = pendingImportUrlRef.current;
      pendingImportUrlRef.current = null;
      handleIncomingUrl(pendingUrl);
    }
  }, [handleIncomingUrl, user]);

  // Still restoring session — show spinner
  if (user === undefined) {
    return (
      <SafeAreaProvider> {/* ← WRAP */}
        <SafeAreaView style={styles.loadingShell}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // No session — show auth screens
  if (!user) {
    return (
      <SafeAreaProvider> {/* ← WRAP */}
        {authMode === 'signin' ? (
          <SignInScreen onSwitchToSignUp={() => setAuthMode('signup')} />
        ) : (
          <SignUpScreen onSwitchToSignIn={() => setAuthMode('signin')} />
        )}
      </SafeAreaProvider>
    );
  }

  // Session restored or just signed in — show main app
  return (
    <SafeAreaProvider> {/* ← WRAP */}
      <ThemeProvider>
        <DrawerProvider>
          <NavigationContainer ref={navigationRef}>
            <BottomTabNavigator />
          </NavigationContainer>

          <DrawerContext.Consumer>
            {({ visible, close }) => (
              <TopMenuDrawer visible={visible} onClose={close} />
            )}
          </DrawerContext.Consumer>
        </DrawerProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
  },
});
