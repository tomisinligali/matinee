import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing, BorderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * Matinee Badge Component
 *
 * @typedef {'primary' | 'success' | 'warning' | 'error' | 'neutral'} BadgeVariant
 * @typedef {'sm' | 'md'} BadgeSize
 *
 * @param {Object} props
 * @param {BadgeVariant} [props.variant='primary'] Status role variant
 * @param {BadgeSize} [props.size='md'] Badge size
 * @param {boolean} [props.dot=false] Display small dot indicator
 * @param {React.ReactNode} [props.icon] Optional icon before text
 * @param {string} [props.label] Badge text content
 * @param {Object} [props.style] Additional custom styles
 * @param {React.ReactNode} [props.children] Optional custom children
 */
export function Badge({
  variant = 'primary',
  size = 'md',
  dot = false,
  icon,
  label,
  style,
  children,
  ...rest
}) {
  const { colors } = useTheme();

  const variantStyles = {
    primary: {
      backgroundColor: colors.primaryContainer,
      textColor: colors.onPrimaryContainer,
      dotColor: colors.primary
    },
    success: {
      backgroundColor: colors.successContainer,
      textColor: colors.onSuccessContainer,
      dotColor: colors.success
    },
    warning: {
      backgroundColor: colors.warningContainer,
      textColor: colors.onWarningContainer,
      dotColor: colors.warning
    },
    error: {
      backgroundColor: colors.errorContainer,
      textColor: colors.onErrorContainer,
      dotColor: colors.error
    },
    neutral: {
      backgroundColor: colors.surfaceContainerHigh,
      textColor: colors.onSurface,
      dotColor: colors.outline
    }
  }[variant] || {
    backgroundColor: colors.primaryContainer,
    textColor: colors.onPrimaryContainer,
    dotColor: colors.primary
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: variantStyles.backgroundColor,
          paddingHorizontal: isSmall ? Spacing.xxs + 2 : Spacing.xs + 2,
          paddingVertical: isSmall ? 2 : Spacing.xxs,
          borderRadius: isSmall ? BorderRadius.xs : BorderRadius.sm
        },
        style
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label || (typeof children === 'string' ? children : variant)}`}
      {...rest}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: variantStyles.dotColor,
              width: isSmall ? 5 : 6,
              height: isSmall ? 5 : 6
            }
          ]}
        />
      )}
      {icon && <View style={styles.iconBox}>{icon}</View>}
      {label ? (
        <Text
          variant={isSmall ? 'labelSmall' : 'labelMedium'}
          style={[styles.text, { color: variantStyles.textColor }]}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  dot: {
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xxs
  },
  iconBox: {
    marginRight: Spacing.xxs
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5
  }
});

export default Badge;
