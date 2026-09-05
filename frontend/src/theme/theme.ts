export type ColorMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  ink: string;
  textMuted: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  border: string;
  secondaryBg: string;
  secondaryLabel: string;
  skeleton: string;
  liveLabel: string;
  liveBg: string;
  cacheLabel: string;
  cacheBg: string;
  danger: string;
  dangerSurface: string;
  dangerBorder: string;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const typography = {
  display: 28,
  title: 18,
  body: 16,
  small: 13,
  caption: 12,
} as const;

export const LIGHT: ThemeColors = {
  background: '#f4f6fb',
  surface: '#ffffff',
  ink: '#101828',
  textMuted: '#667085',
  primary: '#1d4ed8',
  primaryPressed: '#1e40af',
  onPrimary: '#ffffff',
  border: '#d7dee9',
  secondaryBg: '#eef2f7',
  secondaryLabel: '#1a2434',
  skeleton: '#e4eaf2',
  liveLabel: '#067647',
  liveBg: '#ecfdf3',
  cacheLabel: '#344054',
  cacheBg: '#f2f4f7',
  danger: '#b42318',
  dangerSurface: '#fef3f2',
  dangerBorder: '#fda29b',
};

export const DARK: ThemeColors = {
  background: '#0b1220',
  surface: '#131c30',
  ink: '#e8edf5',
  textMuted: '#9aa5b9',
  primary: '#60a5fa',
  primaryPressed: '#93c5fd',
  onPrimary: '#0b1220',
  border: '#24314d',
  secondaryBg: '#1b2740',
  secondaryLabel: '#dbe4f0',
  skeleton: '#1e2a44',
  liveLabel: '#34d399',
  liveBg: '#0d2b1f',
  cacheLabel: '#c8d2e3',
  cacheBg: '#1b2740',
  danger: '#fda29b',
  dangerSurface: '#2b1216',
  dangerBorder: '#7a2d25',
};

export const PALETTES: Record<ColorMode, ThemeColors> = {
  light: LIGHT,
  dark: DARK,
};