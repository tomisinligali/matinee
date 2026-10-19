import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { Typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Matinee Text Component
 *
 * @typedef {'displayLarge' | 'displayMedium' | 'displaySmall' |
 *           'headlineLarge' | 'headlineMedium' | 'headlineSmall' |
 *           'titleLarge' | 'titleMedium' | 'titleSmall' |
 *           'bodyLarge' | 'bodyMedium' | 'bodySmall' |
 *           'labelLarge' | 'labelMedium' | 'labelSmall'} TypographyVariant
 *
 * @typedef {'onSurface' | 'onSurfaceVariant' | 'onSurfaceMuted' | 'primary' |
 *           'onPrimary' | 'secondary' | 'error' | 'success' | 'warning' | 'info'} SemanticColorRole
 *
 * @param {Object} props
 * @param {TypographyVariant} [props.variant='bodyMedium'] Typographic hierarchy token
 * @param {SemanticColorRole | string} [props.color='onSurface'] Semantic color role or explicit color
 * @param {'left' | 'center' | 'right'} [props.align='left'] Text alignment
 * @param {number} [props.numberOfLines] Max lines before truncation
 * @param {Object} [props.style] Additional custom styles
 * @param {React.ReactNode} props.children Text contents
 */
export function Text({
  variant = 'bodyMedium',
  color = 'onSurface',
  align = 'left',
  numberOfLines,
  style,
  children,
  ...rest
}) {
  const { colors } = useTheme();

  // Resolve semantic color if a matching theme key exists
  const resolvedColor = colors[color] || color;

  const typographyStyle = Typography[variant] || Typography.bodyMedium;

  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        typographyStyle,
        { color: resolvedColor, textAlign: align },
        style
      ]}
      accessibilityRole="text"
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false
  }
});

export default Text;
