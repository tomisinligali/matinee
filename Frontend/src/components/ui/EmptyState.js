import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';
import { Button } from './Button';

/**
 * Matinee Empty State Component
 *
 * @param {Object} props
 * @param {string | React.ReactNode} [props.icon='film-outline'] Icon name or custom ReactNode
 * @param {string} props.title Heading announcing the empty condition
 * @param {string} props.description Explanatory guidance or next steps
 * @param {string} [props.actionLabel] Text for primary action CTA
 * @param {Function} [props.onAction] Handler for primary action CTA
 * @param {string} [props.secondaryActionLabel] Text for secondary action button
 * @param {Function} [props.onSecondaryAction] Handler for secondary action
 * @param {Object} [props.style] Additional custom styles
 */
export function EmptyState({
  icon = 'film-outline',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  ...rest
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainerLowest,
          borderColor: colors.outlineVariant
        },
        style
      ]}
      accessible={true}
      accessibilityRole="summary"
      {...rest}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: colors.surfaceContainer }
        ]}
      >
        {typeof icon === 'string' ? (
          <Ionicons name={icon} size={36} color={colors.outline} />
        ) : (
          icon
        )}
      </View>

      <Text variant="titleMedium" align="center" style={styles.title}>
        {title}
      </Text>

      <Text
        variant="bodyMedium"
        align="center"
        color="onSurfaceVariant"
        style={styles.description}
      >
        {description}
      </Text>

      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="md"
          onPress={onAction}
          style={styles.actionBtn}
        >
          {actionLabel}
        </Button>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <Button
          variant="ghost"
          size="sm"
          onPress={onSecondaryAction}
          style={styles.secondaryBtn}
        >
          {secondaryActionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md
  },
  title: {
    fontWeight: '700',
    marginBottom: Spacing.xxs
  },
  description: {
    lineHeight: 20,
    marginBottom: Spacing.lg,
    maxWidth: 320
  },
  actionBtn: {
    minWidth: 180
  },
  secondaryBtn: {
    marginTop: Spacing.xs
  }
});

export default EmptyState;
