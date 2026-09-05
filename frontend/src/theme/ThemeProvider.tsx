import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  PALETTES,
  radii,
  spacing,
  typography,
  type ColorMode,
  type ThemeColors,
} from './theme';

interface ThemeValue {
  mode: ColorMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const scheme = useColorScheme();
  const mode: ColorMode = scheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeValue>(
    () => ({ mode, colors: PALETTES[mode], spacing, radii, typography }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return value;
}