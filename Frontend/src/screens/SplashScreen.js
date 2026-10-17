import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '../theme/tokens';
import { authStorage } from '../services/authStorage';
import { api } from '../services/api';

export default function SplashScreen({ onNavigate }) {
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const token = await authStorage.getToken();
        if (!token) {
          if (isMounted) onNavigate('auth');
          return;
        }

        // Verify token with backend
        const profile = await api.getProfile();
        if (profile?.user && isMounted) {
          onNavigate('dashboard', profile.user);
        } else {
          await authStorage.clearSession();
          if (isMounted) onNavigate('auth');
        }
      } catch (err) {
        await authStorage.clearSession();
        if (isMounted) onNavigate('auth');
      }
    }

    const timer = setTimeout(checkAuth, 800);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [onNavigate]);

  return (
    <View style={styles.container}>
      <View style={styles.brandBox}>
        <Text style={styles.logoText}>MATINEE</Text>
        <Text style={styles.tagline}>Cinema Ticket Booking</Text>
      </View>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  logoText: {
    ...Typography.displayLarge,
    color: Colors.primary,
    letterSpacing: 2
  },
  tagline: {
    ...Typography.bodyLarge,
    color: Colors.onSurface,
    marginTop: Spacing.xs,
    opacity: 0.8
  },
  spinner: {
    marginTop: Spacing.md
  }
});
