/**
 * ==============================================================================
 * MATINEE DESIGN TOKENS (REACT NATIVE ADAPTER)
 * Generated from design-tokens.tokens.json & design-tokens.css
 * Follows design-system.md: Uses semantic roles, strictly NO raw palette values.
 * ==============================================================================
 */

export const Colors = {
  // Primary
  primary: 'rgba(126, 44, 222, 1)',
  onPrimary: 'rgba(255, 255, 255, 1)',
  primaryContainer: 'rgba(228, 211, 248, 1)',
  onPrimaryContainer: 'rgba(72, 21, 132, 1)',

  // Secondary
  secondary: 'rgba(90, 32, 172, 1)',
  onSecondary: 'rgba(255, 255, 255, 1)',
  secondaryContainer: 'rgba(227, 212, 247, 1)',
  onSecondaryContainer: 'rgba(68, 24, 129, 1)',

  // Tertiary
  tertiary: 'rgba(83, 9, 195, 1)',
  onTertiary: 'rgba(255, 255, 255, 1)',
  tertiaryContainer: 'rgba(225, 206, 253, 1)',
  onTertiaryContainer: 'rgba(62, 7, 146, 1)',

  // Neutral / Surface
  surface: 'rgba(250, 250, 250, 1)',
  onSurface: 'rgba(26, 26, 26, 1)',
  surfaceContainer: 'rgba(242, 242, 242, 1)',
  surfaceContainerHigh: 'rgba(230, 230, 230, 1)',
  surfaceContainerHighest: 'rgba(230, 230, 230, 1)',
  surfaceContainerLow: 'rgba(250, 250, 250, 1)',
  surfaceContainerLowest: 'rgba(255, 255, 255, 1)',
  inverseSurface: 'rgba(51, 51, 51, 1)',
  inverseOnSurface: 'rgba(242, 242, 242, 1)',

  // Status & Feedback
  error: 'rgba(186, 13, 16, 1)',
  onError: 'rgba(255, 255, 255, 1)',
  errorContainer: 'rgba(251, 230, 231, 1)',
  onErrorContainer: 'rgba(112, 8, 10, 1)',

  success: 'rgba(4, 128, 46, 1)',
  onSuccess: 'rgba(255, 255, 255, 1)',
  successContainer: 'rgba(215, 245, 225, 1)',
  onSuccessContainer: 'rgba(2, 64, 23, 1)',

  warning: 'rgba(186, 123, 13, 1)',
  onWarning: 'rgba(255, 255, 255, 1)',
  warningContainer: 'rgba(253, 244, 222, 1)',
  onWarningContainer: 'rgba(93, 62, 7, 1)',

  info: 'rgba(13, 42, 186, 1)',
  onInfo: 'rgba(255, 255, 255, 1)',
  infoContainer: 'rgba(223, 228, 251, 1)',
  onInfoContainer: 'rgba(7, 21, 93, 1)',

  // Outlines and borders
  outline: 'rgba(204, 204, 204, 1)',
  outlineVariant: 'rgba(230, 230, 230, 1)'
};

export const Spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  huge: 48
};

export const Typography = {
  // Lora Display
  displayLarge: {
    fontFamily: 'System', // Fallback until custom fonts loaded
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
    color: Colors.onSurface
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    color: Colors.onSurface
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: Colors.onSurface
  },

  // DM Sans Headlines
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: Colors.onSurface
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.onSurface
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: Colors.onSurface
  },

  // Body
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: Colors.onSurface
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.onSurface
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: Colors.onSurface
  },

  // Labels
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.onSurface
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: Colors.onSurface
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
    color: Colors.onSurface
  }
};
