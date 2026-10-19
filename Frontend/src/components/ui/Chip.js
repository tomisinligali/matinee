import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Spacing, BorderRadius } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * Matinee Filter Chip Component
 *
 * @param {Object} props
 * @param {string} props.label Chip label text
 * @param {boolean} [props.selected=false] Whether the chip is active/selected
 * @param {boolean} [props.disabled=false] Disables user interaction
 * @param {React.ReactNode} [props.icon] Optional leading icon
 * @param {Function} [props.onPress] Callback when chip is pressed
 * @param {string} [props.accessibilityLabel] Screen reader announcement
 * @param {Object} [props.style] Additional custom styles
 */
export function Chip({
  label,
  selected = false,
  disabled = false,
  icon,
  onPress,
  accessibilityLabel,
  style,
  ...rest
}) {
  const { colors } = useTheme();

  const handlePress = (e) => {
    if (disabled) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (onPress) {
      onPress(e);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }} // Guarantees 44x44 touch target with 40pt height
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceContainerLowest,
          borderColor: selected ? colors.primary : colors.outlineVariant
        },
        disabled && styles.disabled,
        style
      ]}
      accessible={true}
      accessibilityRole="checkbox"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel || `${label} filter chip`}
      {...rest}
    >
      {icon && (
        <View style={styles.iconWrap}>
          {icon}
        </View>
      )}
      <Text
        variant="labelMedium"
        style={[
          styles.label,
          {
            color: selected ? colors.onPrimary : colors.onSurface,
            fontWeight: selected ? '700' : '600'
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40, // Adheres to user requirement: minHeight: 40
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  iconWrap: {
    marginRight: Spacing.xs
  },
  label: {
    textAlign: 'center'
  },
  disabled: {
    opacity: 0.45
  }
});

export default Chip;
