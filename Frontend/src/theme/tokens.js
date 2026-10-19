/**
 * ==============================================================================
 * MATINEE DESIGN TOKENS (REACT NATIVE ADAPTER)
 * Generated from design-tokens.tokens.json & design-tokens.css
 * Follows design-system.md: Uses semantic roles, strictly NO raw palette values.
 * ==============================================================================
 */

export const Colors = {
  // Primary (Rich Cinematic Violet)
  primary: 'rgba(142, 68, 235, 1)',
  onPrimary: 'rgba(255, 255, 255, 1)',
  primaryContainer: 'rgba(62, 22, 108, 1)',
  onPrimaryContainer: 'rgba(228, 211, 248, 1)',

  // Secondary
  secondary: 'rgba(168, 125, 238, 1)',
  onSecondary: 'rgba(25, 10, 48, 1)',
  secondaryContainer: 'rgba(52, 22, 88, 1)',
  onSecondaryContainer: 'rgba(227, 212, 247, 1)',

  // Tertiary
  tertiary: 'rgba(160, 95, 245, 1)',
  onTertiary: 'rgba(25, 5, 55, 1)',
  tertiaryContainer: 'rgba(48, 15, 95, 1)',
  onTertiaryContainer: 'rgba(225, 206, 253, 1)',

  // Neutral / Surface (Cinematic Dark Theme)
  surface: 'rgba(13, 13, 18, 1)',
  onSurface: 'rgba(244, 244, 248, 1)',
  surfaceContainer: 'rgba(26, 26, 36, 1)',
  surfaceContainerHigh: 'rgba(34, 34, 46, 1)',
  surfaceContainerHighest: 'rgba(44, 44, 58, 1)',
  surfaceContainerLow: 'rgba(18, 18, 25, 1)',
  surfaceContainerLowest: 'rgba(22, 22, 30, 1)',
  inverseSurface: 'rgba(244, 244, 248, 1)',
  inverseOnSurface: 'rgba(18, 18, 25, 1)',

  // Status & Feedback (High contrast for dark surfaces)
  error: 'rgba(248, 113, 113, 1)',
  onError: 'rgba(69, 10, 10, 1)',
  errorContainer: 'rgba(90, 20, 24, 1)',
  onErrorContainer: 'rgba(254, 202, 202, 1)',

  success: 'rgba(52, 211, 153, 1)',
  onSuccess: 'rgba(6, 78, 59, 1)',
  successContainer: 'rgba(16, 62, 42, 1)',
  onSuccessContainer: 'rgba(167, 243, 208, 1)',

  warning: 'rgba(251, 191, 36, 1)',
  onWarning: 'rgba(120, 53, 15, 1)',
  warningContainer: 'rgba(75, 45, 10, 1)',
  onWarningContainer: 'rgba(253, 230, 138, 1)',

  info: 'rgba(96, 165, 250, 1)',
  onInfo: 'rgba(30, 58, 138, 1)',
  infoContainer: 'rgba(25, 50, 100, 1)',
  onInfoContainer: 'rgba(191, 219, 254, 1)',

  // Outlines and borders
  outline: 'rgba(65, 65, 82, 1)',
  outlineVariant: 'rgba(38, 38, 52, 1)'
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

export const BorderRadius = {
  none: 0,
  xs: 4,      // micro badges, tags
  sm: 6,      // chips, small badges
  md: 8,      // buttons, input fields, posters
  lg: 12,     // cards, hero banners, search bar
  xl: 16,     // modal dialogs, sheets
  full: 9999  // circular avatars, floating action buttons
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  hard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  }
};
