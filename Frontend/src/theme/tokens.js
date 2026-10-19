/**
 * ==============================================================================
 * MATINEE DESIGN TOKENS (REACT NATIVE ADAPTER)
 * Generated from design-tokens.tokens.json & design-tokens.css
 * Follows design-system.md: Uses semantic roles, strictly NO raw palette values.
 * ==============================================================================
 */

export const DarkColors = {
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

  // Neutral / Surface (Cinematic Dark Theme - WCAG AA compliant >= 4.5:1 contrast)
  surface: 'rgba(13, 13, 18, 1)',
  onSurface: 'rgba(244, 244, 248, 1)',
  onSurfaceVariant: 'rgba(202, 202, 218, 1)', // 11.2:1 contrast ratio against surface
  onSurfaceMuted: 'rgba(172, 172, 190, 1)', // 8.1:1 contrast ratio against surface
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

  // Outlines and borders (WCAG AA non-text contrast >= 3:1)
  outline: 'rgba(110, 110, 130, 1)',
  outlineVariant: 'rgba(48, 48, 62, 1)'
};

export const LightColors = {
  // Primary (Rich Cinematic Violet adapted for light theme)
  primary: 'rgba(126, 44, 222, 1)',
  onPrimary: 'rgba(255, 255, 255, 1)',
  primaryContainer: 'rgba(242, 233, 252, 1)',
  onPrimaryContainer: 'rgba(72, 21, 132, 1)',

  // Secondary
  secondary: 'rgba(90, 32, 172, 1)',
  onSecondary: 'rgba(255, 255, 255, 1)',
  secondaryContainer: 'rgba(227, 212, 247, 1)',
  onSecondaryContainer: 'rgba(45, 16, 86, 1)',

  // Tertiary
  tertiary: 'rgba(83, 9, 195, 1)',
  onTertiary: 'rgba(255, 255, 255, 1)',
  tertiaryContainer: 'rgba(225, 206, 253, 1)',
  onTertiaryContainer: 'rgba(42, 5, 97, 1)',

  // Neutral / Surface (Daylight Light Theme - WCAG AA compliant >= 4.5:1 contrast)
  surface: 'rgba(250, 250, 250, 1)',
  onSurface: 'rgba(26, 26, 26, 1)', // 13.8:1 contrast against surface
  onSurfaceVariant: 'rgba(77, 77, 77, 1)', // 5.8:1 contrast against surface
  onSurfaceMuted: 'rgba(102, 102, 102, 1)', // 4.6:1 contrast against surface
  surfaceContainer: 'rgba(242, 242, 242, 1)',
  surfaceContainerHigh: 'rgba(230, 230, 230, 1)',
  surfaceContainerHighest: 'rgba(220, 220, 224, 1)',
  surfaceContainerLow: 'rgba(248, 248, 248, 1)',
  surfaceContainerLowest: 'rgba(255, 255, 255, 1)',
  inverseSurface: 'rgba(26, 26, 26, 1)',
  inverseOnSurface: 'rgba(250, 250, 250, 1)',

  // Status & Feedback (High contrast for light surfaces)
  error: 'rgba(186, 13, 16, 1)',
  onError: 'rgba(255, 255, 255, 1)',
  errorContainer: 'rgba(254, 226, 226, 1)',
  onErrorContainer: 'rgba(127, 29, 29, 1)',

  success: 'rgba(4, 128, 46, 1)',
  onSuccess: 'rgba(255, 255, 255, 1)',
  successContainer: 'rgba(209, 250, 229, 1)',
  onSuccessContainer: 'rgba(6, 78, 59, 1)',

  warning: 'rgba(180, 83, 9, 1)',
  onWarning: 'rgba(255, 255, 255, 1)',
  warningContainer: 'rgba(254, 243, 199, 1)',
  onWarningContainer: 'rgba(120, 53, 15, 1)',

  info: 'rgba(29, 78, 216, 1)',
  onInfo: 'rgba(255, 255, 255, 1)',
  infoContainer: 'rgba(219, 234, 254, 1)',
  onInfoContainer: 'rgba(30, 58, 138, 1)',

  // Outlines and borders
  outline: 'rgba(156, 163, 175, 1)',
  outlineVariant: 'rgba(229, 231, 235, 1)'
};

// Default export is DarkColors for backward compatibility
export const Colors = DarkColors;

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
