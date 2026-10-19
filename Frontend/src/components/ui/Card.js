import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius, Shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Matinee Card Component
 *
 * @typedef {'elevated' | 'outlined' | 'filled'} CardVariant
 * @typedef {'none' | 'sm' | 'md' | 'lg'} CardPadding
 *
 * @param {Object} props
 * @param {CardVariant} [props.variant='elevated'] Visual styling variant
 * @param {CardPadding} [props.padding='md'] Internal padding scale
 * @param {Function} [props.onPress] Optional press handler making the card interactive
 * @param {string} [props.accessibilityLabel] Screen reader announcement for interactive cards
 * @param {Object} [props.style] Additional custom styles
 * @param {React.ReactNode} props.children Card contents
 */
export function Card({
  variant = 'elevated',
  padding = 'md',
  onPress,
  accessibilityLabel,
  style,
  children,
  ...rest
}) {
  const { colors, isDark } = useTheme();

  const handlePress = (e) => {
    if (!onPress) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    onPress(e);
  };

  const paddingValue = {
    none: 0,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg
  }[padding];

  const variantStyle = {
    elevated: {
      backgroundColor: colors.surfaceContainerLowest,
      borderWidth: 1,
      borderColor: colors.outlineVariant,
      ...(isDark ? Shadows.soft : Shadows.medium)
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.outlineVariant
    },
    filled: {
      backgroundColor: colors.surfaceContainer,
      borderWidth: 0,
      borderColor: 'transparent'
    }
  }[variant] || {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.75 : 1}
      style={[
        styles.card,
        variantStyle,
        { padding: paddingValue },
        style
      ]}
      accessible={Boolean(onPress || accessibilityLabel)}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden'
  }
});

export default Card;
