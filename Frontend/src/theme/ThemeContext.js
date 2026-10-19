import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { DarkColors, LightColors } from './tokens';

const THEME_STORAGE_KEY = 'matinee_theme_mode';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  colors: DarkColors,
  toggleTheme: () => {},
  setTheme: () => {}
});

export function ThemeProvider({ children }) {
  // Default is dark mode per requirement
  const [theme, setThemeState] = useState('dark');

  useEffect(() => {
    // Load persisted theme preference asynchronously
    let isMounted = true;
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved && (saved === 'dark' || saved === 'light') && isMounted) {
          setThemeState(saved);
        }
      } catch (_) {
        // SecureStore fallback if unavailable in environment
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = async (newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    setThemeState(newTheme);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (_) {}
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        toggleTheme,
        setTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
