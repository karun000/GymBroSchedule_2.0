import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'gymbro_theme_mode';

const light = {
  mode: 'light',
  colors: {
    bg: '#FFFFFF',
    card: '#F6F6FA',
    purple: '#7B5CC8',
    white: '#0C0C1A',
    gray: '#6B6B80',
    border: '#E6E6EA',
  },
};

const dark = {
  mode: 'dark',
  colors: {
    bg: '#0C0C1A',
    card: '#14142A',
    purple: '#7B5CC8',
    white: '#FFFFFF',
    gray: '#9A9AAC',
    border: '#22223A',
  },
};

export const ThemeContext = createContext({
  theme: dark,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') {
          setMode(saved);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);

    try {
      await AsyncStorage.setItem(THEME_KEY, next);
    } catch (e) {
      // ignore
    }
  }, [mode]);

  const theme = useMemo(() => (mode === 'dark' ? dark : light), [mode]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
