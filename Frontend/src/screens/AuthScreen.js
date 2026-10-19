import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../theme/tokens';
import { api } from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ onNavigate }) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'CINEMA_OPERATOR' | 'PLATFORM_ADMIN'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validate = () => {
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return false;
    }
    if (!isLogin && !name.trim()) {
      setErrorMessage('Please enter your name.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    if (!validate()) return;

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email: email.trim(), password });
        onNavigate('dashboard', res.user);
      } else {
        const res = await api.register({
          email: email.trim(),
          password,
          name: name.trim(),
          role
        });
        onNavigate('dashboard', res.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>MATINEE</Text>
          <Text style={styles.formTitle}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
          <Text style={styles.formSubtitle}>
            {isLogin
              ? 'Enter your credentials to access your tickets'
              : 'Register to start booking cinema screenings'}
          </Text>
        </View>

        {/* Mode Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, isLogin && styles.activeTab]}
            onPress={() => { setIsLogin(true); setErrorMessage(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.activeTab]}
            onPress={() => { setIsLogin(false); setErrorMessage(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Error Alert Banner */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          {!isLogin ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Your Role</Text>
                <View style={styles.roleGrid}>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'CUSTOMER' && styles.activeRoleCard]}
                    onPress={() => setRole('CUSTOMER')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="ticket-outline"
                      size={20}
                      color={role === 'CUSTOMER' ? Colors.onPrimaryContainer : Colors.onSurface}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.roleTitle, role === 'CUSTOMER' && styles.activeRoleTitle]}>
                      Moviegoer
                    </Text>
                    <Text style={styles.roleDesc}>Book films & seats</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, role === 'CINEMA_OPERATOR' && styles.activeRoleCard]}
                    onPress={() => setRole('CINEMA_OPERATOR')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={role === 'CINEMA_OPERATOR' ? Colors.onPrimaryContainer : Colors.onSurface}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.roleTitle, role === 'CINEMA_OPERATOR' && styles.activeRoleTitle]}>
                      Cinema Operator
                    </Text>
                    <Text style={styles.roleDesc}>Manage screens & showtimes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.roleCard, role === 'PLATFORM_ADMIN' && styles.activeRoleCard]}
                    onPress={() => setRole('PLATFORM_ADMIN')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={role === 'PLATFORM_ADMIN' ? Colors.onPrimaryContainer : Colors.onSurface}
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[styles.roleTitle, role === 'PLATFORM_ADMIN' && styles.activeRoleTitle]}>
                      Platform Admin
                    </Text>
                    <Text style={styles.roleDesc}>Audits & network operations</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jane Doe"
                  placeholderTextColor={Colors.onSurface}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@domain.com"
              placeholderTextColor={Colors.onSurface}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password (Min. 8 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.onSurface}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.surface
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  appTitle: {
    ...Typography.headlineMedium,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xs
  },
  formTitle: {
    ...Typography.headlineLarge,
    color: Colors.onSurface,
    marginTop: Spacing.xs
  },
  formSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: Spacing.xxs
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxs,
    marginBottom: Spacing.md
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    borderRadius: BorderRadius.sm
  },
  activeTab: {
    backgroundColor: Colors.primaryContainer
  },
  tabText: {
    ...Typography.labelLarge,
    color: Colors.onSurface
  },
  activeTabText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700'
  },
  errorBox: {
    backgroundColor: Colors.errorContainer,
    borderColor: Colors.error,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md
  },
  errorText: {
    ...Typography.bodyMedium,
    color: Colors.onErrorContainer,
    textAlign: 'center'
  },
  form: {
    gap: Spacing.md
  },
  inputGroup: {
    gap: Spacing.xxs
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.onSurface
  },
  roleGrid: {
    gap: Spacing.xs,
    marginTop: Spacing.xxs
  },
  roleCard: {
    flexDirection: 'column',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm
  },
  activeRoleCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryContainer
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: Spacing.xxs
  },
  roleTitle: {
    ...Typography.labelLarge,
    color: Colors.onSurface,
    fontWeight: '700'
  },
  activeRoleTitle: {
    color: Colors.onPrimaryContainer
  },
  roleDesc: {
    ...Typography.bodySmall,
    color: Colors.onSurface,
    opacity: 0.7,
    marginTop: Spacing.xxs
  },
  input: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: Colors.outline,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.onSurface
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 48,
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    ...Typography.labelLarge,
    color: Colors.onPrimary,
    fontSize: 16
  }
});
