import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, BorderRadius, Typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';
import { Text } from './Text';

/**
 * Matinee Text Input Component
 *
 * @param {Object} props
 * @param {string} [props.label] Optional field label above the input
 * @param {string} props.value Current input text value
 * @param {Function} props.onChangeText Text change callback
 * @param {string} [props.placeholder] Placeholder string
 * @param {string} [props.error] Error message string (activates error styling)
 * @param {string} [props.helperText] Informational caption below input
 * @param {boolean} [props.disabled=false] Disables user editing
 * @param {boolean} [props.secureTextEntry=false] Password hiding toggle
 * @param {boolean} [props.clearable=false] Displays clear button when value is non-empty
 * @param {React.ReactNode} [props.iconLeading] Icon placed inside the start of the field
 * @param {React.ReactNode} [props.iconTrailing] Icon placed inside the end of the field
 * @param {string} [props.accessibilityLabel] Screen reader label
 * @param {Object} [props.containerStyle] Styling for the outer wrapper
 * @param {Object} [props.style] Styling for the inner TextInput
 */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  disabled = false,
  secureTextEntry = false,
  clearable = false,
  iconLeading,
  iconTrailing,
  accessibilityLabel,
  containerStyle,
  style,
  ...rest
}) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(!secureTextEntry);

  const hasError = Boolean(error);

  const getBorderColor = () => {
    if (hasError) return colors.error;
    if (isFocused) return colors.primary;
    return colors.outlineVariant;
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: hasError ? colors.error : colors.onSurface }]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: disabled ? colors.surfaceContainer : colors.surfaceContainerLowest,
            borderColor: getBorderColor()
          },
          disabled && styles.disabled
        ]}
      >
        {iconLeading && <View style={styles.iconLeading}>{iconLeading}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !isSecureVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.textInput,
            Typography.bodyMedium,
            { color: colors.onSurface },
            style
          ]}
          accessibilityLabel={accessibilityLabel || label || placeholder}
          accessibilityState={{ disabled }}
          {...rest}
        />

        {clearable && Boolean(value) && !disabled && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear input text"
          >
            <Ionicons name="close-circle" size={18} color={colors.outline} />
          </TouchableOpacity>
        )}

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsSecureVisible(!isSecureVisible)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={isSecureVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={isSecureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.outline}
            />
          </TouchableOpacity>
        )}

        {iconTrailing && !secureTextEntry && (
          <View style={styles.iconTrailing}>{iconTrailing}</View>
        )}
      </View>

      {hasError ? (
        <View style={styles.feedbackRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} style={{ marginRight: 4 }} />
          <Text variant="labelSmall" style={{ color: colors.error }}>
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text variant="labelSmall" style={[styles.helperText, { color: colors.onSurfaceMuted }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: Spacing.sm
  },
  label: {
    marginBottom: Spacing.xxs,
    fontWeight: '600'
  },
  inputContainer: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0
  },
  iconLeading: {
    marginRight: Spacing.xs
  },
  iconTrailing: {
    marginLeft: Spacing.xs
  },
  actionBtn: {
    padding: Spacing.xxs,
    marginLeft: Spacing.xxs
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxs
  },
  helperText: {
    marginTop: Spacing.xxs
  },
  disabled: {
    opacity: 0.5
  }
});

export default Input;
