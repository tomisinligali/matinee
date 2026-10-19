import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  View
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * Matinee Button Component
 *
 * @typedef {'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'} ButtonVariant
 * @typedef {'sm' | 'md' | 'lg'} ButtonSize
 *
 * @param {Object} props
 * @param {ButtonVariant} [props.variant='primary'] Visual style variant
 * @param {ButtonSize} [props.size='md'] Button size
 * @param {boolean} [props.loading=false] Displays spinner and disables interaction
 * @param {boolean} [props.disabled=false] Disables button interactions and reduces opacity
 * @param {boolean} [props.fullWidth=false] Stretches button across container width
 * @param {React.ReactNode} [props.iconLeading] Optional icon placed before label
 * @param {React.ReactNode} [props.iconTrailing] Optional icon placed after label
 * @param {string} [props.accessibilityLabel] Screen reader label
 * @param {Function} props.onPress Callback invoked on press
 * @param {Object} [props.style] Additional custom styles
 * @param {React.ReactNode} props.children Button title or custom inner content
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeading,
  iconTrailing,
  accessibilityLabel,
  onPress,
  style,
  children,
  ...rest
}) {
  const { colors } = useTheme();

  const handlePress = (e) => {
    if (disabled || loading) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (onPress) {
      onPress(e);
    }
  };

  // Variant styling
  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      textColor: colors.onPrimary,
      spinnerColor: colors.onPrimary
    },
    secondary: {
      backgroundColor: colors.primaryContainer,
      borderColor: colors.primaryContainer,
      textColor: colors.onPrimaryContainer,
      spinnerColor: colors.onPrimaryContainer
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.outlineVariant,
      textColor: colors.onSurface,
      spinnerColor: colors.onSurface
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: colors.primary,
      spinnerColor: colors.primary
    },
    danger: {
      backgroundColor: colors.error,
      borderColor: colors.error,
      textColor: colors.onError,
      spinnerColor: colors.onError
    }
  }[variant] || {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: colors.onPrimary,
    spinnerColor: colors.onPrimary
  };

  // Size styling
  const sizeStyles = {
    sm: {
      minHeight: 36,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      textVariant: 'labelMedium',
      hitSlop: { top: 4, bottom: 4, left: 4, right: 4 } // Guarantees 44x44 minimum touch target
    },
    md: {
      minHeight: 44,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      textVariant: 'labelLarge',
      hitSlop: undefined
    },
    lg: {
      minHeight: 52,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.lg,
      textVariant: 'titleMedium',
      hitSlop: undefined
    }
  }[size] || {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    textVariant: 'labelLarge',
    hitSlop: undefined
  };

  const isInteractive = !disabled && !loading;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!isInteractive}
      activeOpacity={0.75}
      hitSlop={sizeStyles.hitSlop}
      style={[
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          minHeight: sizeStyles.minHeight,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          borderRadius: sizeStyles.borderRadius
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : 'Button')}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.spinnerColor} />
      ) : (
        <View style={styles.contentRow}>
          {iconLeading && <View style={styles.iconLeading}>{iconLeading}</View>}
          {typeof children === 'string' ? (
            <Text
              variant={sizeStyles.textVariant}
              style={[styles.label, { color: variantStyles.textColor }]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {iconTrailing && <View style={styles.iconTrailing}>{iconTrailing}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  fullWidth: {
    width: '100%'
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconLeading: {
    marginRight: Spacing.xs
  },
  iconTrailing: {
    marginLeft: Spacing.xs
  },
  label: {
    fontWeight: '700',
    textAlign: 'center'
  },
  disabled: {
    opacity: 0.45
  }
});

export default Button;
