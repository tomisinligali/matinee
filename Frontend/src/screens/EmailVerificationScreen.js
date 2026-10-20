import React, { useState, useEffect } from 'react';
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
import { Spacing, Typography, BorderRadius } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { api } from '../services/api';

export default function EmailVerificationScreen({ email, user, onNavigate, onBackToAuth }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(30);

  const targetEmail = email || user?.email || '';

  // 30-second cooldown timer for resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (text) => {
    // Only allow digits and limit to 6 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const response = await api.verifyCode({
        email: targetEmail,
        code
      });

      if (response?.user || response?.success) {
        setInfoMessage('Email verified successfully! Taking you to the dashboard...');
        setTimeout(() => {
          onNavigate('dashboard', response.user || { ...user, emailVerified: true });
        }, 800);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      await api.resendVerification(targetEmail);
      setInfoMessage('A fresh verification code has been dispatched to your email.');
      setResendCooldown(45);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  const isButtonDisabled = code.length < 6 || loading;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Brand & Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="mail-unread-outline" size={48} color={colors.primary} />
          </View>

          <Text style={styles.brandTitle}>MATINEE</Text>
          <Text style={styles.screenTitle}>Verify Your Email</Text>

          <Text style={styles.instructionText}>
            We have sent a 6-digit verification code to:
          </Text>
          <Text style={styles.emailBadge}>{targetEmail}</Text>

          <Text style={styles.subtext}>
            Enter the code below to activate your account and access your dashboard.
          </Text>

          {/* Verification Code Form */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>VERIFICATION CODE</Text>
            <View
              style={[
                styles.inputWrapper,
                errorMessage ? styles.inputWrapperError : null,
                code.length === 6 ? styles.inputWrapperSuccess : null
              ]}
            >
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="• • • • • •"
                placeholderTextColor={colors.onSurfaceMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />
            </View>
          </View>

          {/* Feedback Messages */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
              <Text style={styles.successText}>{infoMessage}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              isButtonDisabled ? styles.buttonDisabled : styles.buttonActive
            ]}
            onPress={handleVerify}
            disabled={isButtonDisabled}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify &amp; Continue</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendPrompt}>Didn&apos;t receive the code?</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || resending}
              style={styles.resendButton}
            >
              {resending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text
                  style={[
                    styles.resendButtonText,
                    resendCooldown > 0 && styles.resendDisabledText
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend Code in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Login */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToAuth}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getStyles(colors) {
  return StyleSheet.create({
    keyboardContainer: {
      flex: 1,
      backgroundColor: colors.surface
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg
    },
    card: {
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.surfaceContainer,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: colors.surfaceContainerHigh,
      padding: Spacing.xl,
      alignItems: 'center',
      ...Platform.select({
        web: {
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6)'
        },
        default: {
          elevation: 8
        }
      })
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md
    },
    brandTitle: {
      ...Typography.headlineMedium,
      color: colors.primary,
      letterSpacing: 2,
      fontWeight: '800',
      marginBottom: Spacing.xs
    },
    screenTitle: {
      ...Typography.titleLarge,
      color: colors.onSurface,
      fontWeight: '700',
      marginBottom: Spacing.sm
    },
    instructionText: {
      ...Typography.bodyMedium,
      color: colors.onSurfaceVariant,
      textAlign: 'center'
    },
    emailBadge: {
      ...Typography.bodyMedium,
      color: colors.primary,
      fontWeight: '700',
      backgroundColor: colors.surfaceContainerHighest,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
      marginVertical: Spacing.sm
    },
    subtext: {
      ...Typography.bodySmall,
      color: colors.onSurfaceMuted,
      textAlign: 'center',
      marginBottom: Spacing.lg
    },
    formGroup: {
      width: '100%',
      marginBottom: Spacing.md
    },
    inputLabel: {
      ...Typography.labelMedium,
      color: colors.onSurfaceVariant,
      letterSpacing: 1.2,
      fontWeight: '700',
      marginBottom: Spacing.xs,
      textAlign: 'center'
    },
    inputWrapper: {
      backgroundColor: colors.surfaceContainerLowest,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.surfaceContainerHighest,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      alignItems: 'center'
    },
    inputWrapperError: {
      borderColor: colors.error
    },
    inputWrapperSuccess: {
      borderColor: colors.primary
    },
    codeInput: {
      ...Typography.headlineLarge,
      color: colors.onSurface,
      letterSpacing: 12,
      fontWeight: '800',
      textAlign: 'center',
      width: '100%',
      paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.errorContainer,
      borderRadius: BorderRadius.md,
      padding: Spacing.sm,
      width: '100%',
      marginBottom: Spacing.md,
      gap: Spacing.xs
    },
    errorText: {
      ...Typography.bodySmall,
      color: colors.onErrorContainer,
      flex: 1
    },
    successBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successContainer,
      borderRadius: BorderRadius.md,
      padding: Spacing.sm,
      width: '100%',
      marginBottom: Spacing.md,
      gap: Spacing.xs
    },
    successText: {
      ...Typography.bodySmall,
      color: colors.onSuccessContainer,
      flex: 1
    },
    verifyButton: {
      width: '100%',
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.lg
    },
    buttonActive: {
      backgroundColor: colors.primary
    },
    buttonDisabled: {
      backgroundColor: colors.surfaceContainerHighest,
      opacity: 0.6
    },
    verifyButtonText: {
      ...Typography.labelLarge,
      color: colors.onPrimary,
      fontWeight: '700',
      letterSpacing: 0.5
    },
    resendSection: {
      alignItems: 'center',
      marginBottom: Spacing.lg
    },
    resendPrompt: {
      ...Typography.bodySmall,
      color: colors.onSurfaceMuted,
      marginBottom: Spacing.xs
    },
    resendButton: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm
    },
    resendButtonText: {
      ...Typography.bodyMedium,
      color: colors.primary,
      fontWeight: '600'
    },
    resendDisabledText: {
      color: colors.onSurfaceMuted,
      opacity: 0.6
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs
    },
    backButtonText: {
      ...Typography.bodySmall,
      color: colors.onSurfaceVariant
    }
  });
}
