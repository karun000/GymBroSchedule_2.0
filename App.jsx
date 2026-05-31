import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import BottomTabNavigator from './components/BottomNav';
import { navigationRef } from './navigationRef';
import { auth } from './FireBase/firebase';
import ThemeProvider from './context/ThemeContext';
import DrawerProvider, { DrawerContext } from './context/DrawerContext';
import TopMenuDrawer from './components/TopMenuDrawer';
import SignInScreen from './screens/Auth/page';
import SignUpScreen from './screens/Auth/SignUpScreen';
import Theme from './screens/Auth/Theme';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [authMode, setAuthMode] = useState('signin');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) {
    return (
      <SafeAreaView style={styles.loadingShell}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return authMode === 'signin' ? (
      <SignInScreen onSwitchToSignUp={() => setAuthMode('signup')} />
    ) : (
      <SignUpScreen onSwitchToSignIn={() => setAuthMode('signin')} />
    );
  }

  return (
    <ThemeProvider>
      <DrawerProvider>
        <NavigationContainer ref={navigationRef}>
          <BottomTabNavigator />
        </NavigationContainer>

        {/* Render global drawer tied to DrawerProvider */}
        <DrawerContext.Consumer>
          {({ visible, close }) => (
            <TopMenuDrawer visible={visible} onClose={close} />
          )}
        </DrawerContext.Consumer>
      </DrawerProvider>
    </ThemeProvider>
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