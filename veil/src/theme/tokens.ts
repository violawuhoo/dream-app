export const colors = {
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceElevated: '#1A1A26',
  border: '#2A2A3F',
  textPrimary: '#E8E8F0',
  textSecondary: '#8888AA',
  textMuted: '#55556A',
  accent: '#7B6EF6',
  accentSoft: '#2D2847',
  gold: '#C9A84C',
  goldSoft: '#2A2415',
  error: '#E57373',
  success: '#81C784',
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 38,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.8,
} as const;

export const letterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: 1.5,
  widest: 3,
} as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
