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
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api';

export default function AuthScreen({ onNavigate }) {
  const { colors } = useTheme();
  const styles = getAuthStyles(colors);

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'CINEMA_OPERATOR' | 'PLATFORM_ADMIN'

  // Input states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Focused state (active focus highlight)
  const [focusedField, setFocusedField] = useState(null);

  // Field-specific error messages
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Field-specific success state (triggers very light background on successful completion upon blur)
  const [nameSuccess, setNameSuccess] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Submission states
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Reset form errors & success states when switching tabs
  const handleSwitchTab = (loginMode) => {
    setIsLogin(loginMode);
    setGeneralError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setNameSuccess(false);
    setEmailSuccess(false);
    setPasswordSuccess(false);
  };

  /**
   * 1. Full Name Field Handlers (Create Account)
   */
  const handleNameChange = (text) => {
    setName(text);

    // DATA VALIDATION: Only alphabets and spaces allowed
    const hasInvalidChars = /[^a-zA-Z\s]/.test(text);
    if (hasInvalidChars) {
      // Real-time error during typing
      setNameError('Name Must Use Only Letters');
      setNameSuccess(false);
    } else {
      if (nameError === 'Name Must Use Only Letters' || nameError === 'Full Name field cannot be empty') {
        setNameError('');
      }
    }
  };

  const handleNameBlur = () => {
    setFocusedField(null);

    // TRIMMING: Trim trailing/leading empty spaces
    const trimmed = name.trim();
    setName(trimmed);

    // EMPTY FIELD VALIDATION
    if (!trimmed) {
      setNameError('Full Name field cannot be empty');
      setNameSuccess(false);
      return;
    }

    // DATA VALIDATION: Only alphabets allowed
    if (/[^a-zA-Z\s]/.test(trimmed)) {
      setNameError('Name Must Use Only Letters');
      setNameSuccess(false);
      return;
    }

    // LENGTH VALIDATION: At least 2 names / words
    // Checks for empty string after last character of first word and a new word following
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      setNameError('Please enter at least 2 words (e.g. First and Last name)');
      setNameSuccess(false);
      return;
    }

    // SUCCESS STATE: Valid input upon leaving the field
    setNameError('');
    setNameSuccess(true);
  };

  /**
   * 2. Email Address Field Handlers
   */
  const handleEmailChange = (text) => {
    // Bounce down all email addresses to lowercase to eliminate casing conflicts
    const lowerEmail = text.toLowerCase();
    setEmail(lowerEmail);

    if (!isLogin) {
      // DATA TYPE VALIDATION (Create Account)
      // Display real-time message when user starts typing
      if (lowerEmail.length > 0) {
        // Stop displaying the error message the moment user types a domain after the @ symbol
        const parts = lowerEmail.split('@');
        const hasDomainAfterAt = parts.length > 1 && parts[1].length > 0 && parts[1].includes('.') && parts[1].split('.')[1]?.length >= 2;

        if (!hasDomainAfterAt) {
          setEmailError('Enter A Valid Email Address');
          setEmailSuccess(false);
        } else {
          setEmailError('');
        }
      } else {
        setEmailError('');
        setEmailSuccess(false);
      }
    } else {
      if (emailError) setEmailError('');
    }
  };

  const handleEmailBlur = () => {
    setFocusedField(null);

    // TRIMMING & LOWERCASE: Bounce down all emails to lowercase
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);

    // EMPTY FIELD VALIDATION
    if (!trimmed) {
      setEmailError('Email Address field cannot be empty');
      setEmailSuccess(false);
      return;
    }

    // Check domain format
    const parts = trimmed.split('@');
    const hasDomainAfterAt = parts.length > 1 && parts[1].length > 0 && parts[1].includes('.') && parts[1].split('.')[1]?.length >= 2;

    if (!hasDomainAfterAt) {
      setEmailError('Enter A Valid Email Address');
      setEmailSuccess(false);
      return;
    }

    // SUCCESS STATE
    setEmailError('');
    setEmailSuccess(true);
  };

  /**
   * 3. Password Field Handlers
   */
  const handlePasswordChange = (text) => {
    setPassword(text);

    if (text.length > 64) {
      setPasswordError('Password cannot exceed 64 characters');
      setPasswordSuccess(false);
    } else if (passwordError === 'Password cannot exceed 64 characters' || passwordError === 'Password field cannot be empty') {
      setPasswordError('');
    } else if (text.length >= 8 && passwordError === 'Password must be between 8 and 64 characters') {
      setPasswordError('');
    }
  };

  const handlePasswordBlur = () => {
    setFocusedField(null);

    // TRIMMING
    const trimmed = password.trim();
    setPassword(trimmed);

    // EMPTY FIELD VALIDATION
    if (!trimmed) {
      setPasswordError('Password field cannot be empty');
      setPasswordSuccess(false);
      return;
    }

    // Range: 8 min, 64 max
    if (trimmed.length < 8 || trimmed.length > 64) {
      setPasswordError('Password must be between 8 and 64 characters');
      setPasswordSuccess(false);
      return;
    }

    // SUCCESS STATE
    setPasswordError('');
    setPasswordSuccess(true);
  };

  /**
   * 4. Form Completeness Check (DISABLE INPUT CARD BUTTON)
   */
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedPassword = password.trim();

  const isNameValid = !isLogin
    ? (trimmedName.length > 0 &&
       !/[^a-zA-Z\s]/.test(trimmedName) &&
       trimmedName.split(/\s+/).filter(Boolean).length >= 2 &&
       !nameError)
    : true;

  const emailParts = trimmedEmail.split('@');
  const hasDomainAfterAt = emailParts.length > 1 && emailParts[1].length > 0 && emailParts[1].includes('.') && emailParts[1].split('.')[1]?.length >= 2;
  const isEmailValid = trimmedEmail.length > 0 && hasDomainAfterAt && !emailError;

  const isPasswordValid = trimmedPassword.length >= 8 && trimmedPassword.length <= 64 && !passwordError;

  // The button is only enabled the moment the user fills in the last valid piece of data
  const isFormComplete = isLogin
    ? (isEmailValid && isPasswordValid)
    : (isNameValid && isEmailValid && isPasswordValid);

  const isButtonDisabled = !isFormComplete || loading;

  /**
   * 5. Submission Handler
   */
  const handleSubmit = async () => {
    setGeneralError('');

    // Final trim
    const finalEmail = email.trim();
    const finalPassword = password.trim();
    const finalName = name.trim();

    if (!isFormComplete) return;

    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ email: finalEmail, password: finalPassword });
        onNavigate('dashboard', res.user);
      } else {
        const res = await api.register({
          email: finalEmail,
          password: finalPassword,
          name: finalName,
          role
        });
        onNavigate('dashboard', res.user);
      }
    } catch (err) {
      setGeneralError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Helper for dynamic input container styling (border color & background color)
  const getInputStyle = (fieldName, hasError, hasSuccess) => {
    const isFocused = focusedField === fieldName;

    // Stroke / Border Color
    let borderColor = colors.outline;
    let borderWidth = 1;

    if (hasError) {
      borderColor = colors.error; // Design system error red color
      borderWidth = 1.5;
    } else if (isFocused) {
      borderColor = colors.primary;
      borderWidth = 1.5;
    } else if (hasSuccess) {
      borderColor = colors.outlineVariant;
    }

    // Background Color
    // SUCCESS STATE: Very light background color from our design system
    let backgroundColor = colors.surfaceContainerLowest;
    if (hasSuccess && !hasError && !isFocused) {
      backgroundColor = colors.surfaceContainerLow; // Very light tone from tokens
    }

    return {
      borderColor,
      borderWidth,
      backgroundColor
    };
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
            onPress={() => handleSwitchTab(true)}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Sign In Tab"
            accessibilityState={{ selected: isLogin }}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLogin && styles.activeTab]}
            onPress={() => handleSwitchTab(false)}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel="Register Tab"
            accessibilityState={{ selected: !isLogin }}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* General Error Banner */}
        {generalError ? (
          <View style={styles.errorBox} accessible={true} accessibilityRole="alert">
            <Text style={styles.errorText}>{generalError}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        <View style={styles.form}>
          {!isLogin ? (
            <>
              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Select Your Role</Text>
                <View style={styles.roleGrid}>
                  <TouchableOpacity
                    style={[styles.roleCard, role === 'CUSTOMER' && styles.activeRoleCard]}
                    onPress={() => setRole('CUSTOMER')}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityLabel="Moviegoer role"
                    accessibilityState={{ selected: role === 'CUSTOMER' }}
                  >
                    <Ionicons
                      name="ticket-outline"
                      size={20}
                      color={role === 'CUSTOMER' ? colors.onPrimaryContainer : colors.onSurface}
                      style={{ marginBottom: Spacing.xxs }}
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
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityLabel="Cinema Operator role"
                    accessibilityState={{ selected: role === 'CINEMA_OPERATOR' }}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={role === 'CINEMA_OPERATOR' ? colors.onPrimaryContainer : colors.onSurface}
                      style={{ marginBottom: Spacing.xxs }}
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
                    accessible={true}
                    accessibilityRole="radio"
                    accessibilityLabel="Platform Admin role"
                    accessibilityState={{ selected: role === 'PLATFORM_ADMIN' }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={role === 'PLATFORM_ADMIN' ? colors.onPrimaryContainer : colors.onSurface}
                      style={{ marginBottom: Spacing.xxs }}
                    />
                    <Text style={[styles.roleTitle, role === 'PLATFORM_ADMIN' && styles.activeRoleTitle]}>
                      Platform Admin
                    </Text>
                    <Text style={styles.roleDesc}>Audits & network operations</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Full Name Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={[styles.input, getInputStyle('name', !!nameError, nameSuccess)]}
                  placeholder="e.g. Jane Mary Doe"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={name}
                  onChangeText={handleNameChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={handleNameBlur}
                  autoCapitalize="words"
                  editable={!loading}
                  accessible={true}
                  accessibilityLabel="Full Name input"
                />
                {nameError ? (
                  <Text style={styles.fieldErrorText} accessible={true} accessibilityRole="alert">
                    {nameError}
                  </Text>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Email Address Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              style={[styles.input, getInputStyle('email', !!emailError, emailSuccess)]}
              placeholder="you@domain.com"
              placeholderTextColor={colors.onSurfaceVariant}
              value={email}
              onChangeText={handleEmailChange}
              onFocus={() => setFocusedField('email')}
              onBlur={handleEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              accessible={true}
              accessibilityLabel="Email Address input"
            />
            {emailError ? (
              <Text style={styles.fieldErrorText} accessible={true} accessibilityRole="alert">
                {emailError}
              </Text>
            ) : null}
          </View>

          {/* Password Field with Conditional Visibility Toggle Icon */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password (8 to 64 characters)</Text>
            <View style={[styles.passwordContainer, getInputStyle('password', !!passwordError, passwordSuccess)]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.onSurfaceVariant}
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setFocusedField('password')}
                onBlur={handlePasswordBlur}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
                accessible={true}
                accessibilityLabel="Password input"
              />
              {/* Visibility toggle icon appears ONLY when user starts typing password */}
              {password.length > 0 ? (
                <TouchableOpacity
                  style={styles.eyeIconButton}
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            {passwordError ? (
              <Text style={styles.fieldErrorText} accessible={true} accessibilityRole="alert">
                {passwordError}
              </Text>
            ) : null}
          </View>

          {/* Action Button: Disabled until all fields are filled & valid */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isButtonDisabled && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isButtonDisabled}
            activeOpacity={0.85}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ disabled: isButtonDisabled }}
            accessibilityLabel={isLogin ? 'Sign In Button' : 'Create Account Button'}
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={[styles.submitButtonText, isButtonDisabled && styles.submitButtonTextDisabled]}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createAuthStyles = (colors = Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface
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
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: Spacing.xs
  },
  formTitle: {
    ...Typography.headlineLarge,
    color: colors.onSurface,
    marginTop: Spacing.xs
  },
  formSubtitle: {
    ...Typography.bodyMedium,
    color: colors.onSurface,
    opacity: 0.85,
    textAlign: 'center',
    marginTop: Spacing.xxs
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: BorderRadius.md,
    padding: Spacing.xxs,
    marginBottom: Spacing.md
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    borderRadius: BorderRadius.sm
  },
  activeTab: {
    backgroundColor: colors.primaryContainer
  },
  tabText: {
    ...Typography.labelLarge,
    color: colors.onSurface
  },
  activeTabText: {
    color: colors.onPrimaryContainer,
    fontWeight: '700'
  },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md
  },
  errorText: {
    ...Typography.bodyMedium,
    color: colors.onErrorContainer,
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
    color: colors.onSurface
  },
  fieldErrorText: {
    ...Typography.bodySmall,
    color: colors.error,
    marginTop: 2,
    fontWeight: '500'
  },
  roleGrid: {
    gap: Spacing.xs,
    marginTop: Spacing.xxs
  },
  roleCard: {
    flexDirection: 'column',
    minHeight: 64,
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm
  },
  activeRoleCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer
  },
  roleTitle: {
    ...Typography.labelLarge,
    color: colors.onSurface,
    fontWeight: '700'
  },
  activeRoleTitle: {
    color: colors.onPrimaryContainer
  },
  roleDesc: {
    ...Typography.bodySmall,
    color: colors.onSurface,
    opacity: 0.85,
    marginTop: Spacing.xxs
  },
  input: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 48,
    fontSize: 16,
    color: colors.onSurface
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
    paddingVertical: Spacing.sm
  },
  eyeIconButton: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center'
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
    minHeight: 48,
    justifyContent: 'center'
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceContainerHighest,
    opacity: 0.5
  },
  submitButtonText: {
    ...Typography.labelLarge,
    color: colors.onPrimary,
    fontSize: 16
  },
  submitButtonTextDisabled: {
    color: colors.onSurfaceVariant
  }
});

const authStylesCache = new Map();
const getAuthStyles = (colors = Colors) => {
  if (!authStylesCache.has(colors)) {
    authStylesCache.set(colors, createAuthStyles(colors));
  }
  return authStylesCache.get(colors);
};
