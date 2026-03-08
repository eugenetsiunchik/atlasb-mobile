export type ThemeMode = 'dark' | 'light';

const palette = {
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  slate: {
    900: '#0f172a',
    950: '#020617',
  },
  orange: {
    100: '#ffd18a',
    200: '#f9c377',
    300: '#f0b268',
    400: '#e3a35d',
    500: '#d49356',
    600: '#c0834f',
    700: '#a87247',
    800: '#8f6541',
    900: '#7a5a3d',
    motorway: '#ffd18a',
    trunk: '#f9c377',
    primary: '#f0b268',
    secondary: '#e3a35d',
    tertiary: '#d49356',
    minor: '#c0834f',
    service: '#a87247',
    track: '#8f6541',
    path: '#7a5a3d',
  },
} as const;

const colors = {
  gray50: palette.gray[50],
  gray100: palette.gray[100],
  gray200: palette.gray[200],
  gray300: palette.gray[300],
  gray400: palette.gray[400],
  gray500: palette.gray[500],
  gray600: palette.gray[600],
  gray700: palette.gray[700],
  gray800: palette.gray[800],
  gray900: palette.gray[900],
  orangeAccent: palette.orange.primary,
  orangeAccentStrong: palette.orange.secondary,
  orangeAccentMuted: palette.orange.trunk,
  slate900: palette.slate[900],
  slate950: palette.slate[950],
  overlaySubtle: 'rgba(15, 23, 42, 0.14)',
  surfaceDark: 'rgba(17, 24, 39, 0.96)',
  surfaceDarkMuted: 'rgba(31, 41, 55, 0.92)',
  surfaceLight: 'rgba(255, 255, 255, 0.98)',
  tabBarBackground: 'rgba(15, 23, 42, 0.8)',
} as const;

const spacing = {
  xs: 4,
  sm: 10,
  md: 14,
} as const;

export const theme = {
  palette,
  colors,
  spacing,
  accent: {
    primary: colors.orangeAccent,
    strong: colors.orangeAccentStrong,
    soft: colors.orangeAccentMuted,
  },
  createActionMenu: {
    backdrop: colors.overlaySubtle,
    icon: {
      dark: colors.gray50,
      light: colors.gray900,
    },
    menuBackground: {
      dark: colors.surfaceDark,
      light: colors.surfaceLight,
    },
    optionBackground: {
      dark: colors.surfaceDarkMuted,
      light: colors.gray100,
    },
    subtitle: {
      dark: colors.gray300,
      light: colors.gray500,
    },
    title: {
      dark: colors.gray50,
      light: colors.slate900,
    },
    shadow: colors.gray900,
  },
  tabBar: {
    accent: {
      dark: colors.orangeAccent,
      light: colors.orangeAccentStrong,
    },
    activeTint: {
      dark: colors.gray50,
      light: colors.gray900,
    },
    background: {
      dark: colors.tabBarBackground,
      light: colors.tabBarBackground,
    },
    curvedShadow: {
      dark: colors.slate950,
      light: colors.gray900,
    },
    inactiveTint: {
      dark: colors.gray400,
      light: colors.gray500,
    },
    shellShadow: colors.gray900,
  },
} as const;
