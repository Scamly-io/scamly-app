import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { colors, ThemeColors, ColorScheme } from './colors';
import { shadows } from './shadows';
import { spacing, radius, layout } from './spacing';

type ThemeContextType = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  shadows: typeof shadows.light;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    systemColorScheme === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
      setColorScheme(newScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (systemColorScheme) {
      setColorScheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    }
  }, [systemColorScheme]);

  const isDark = colorScheme === 'dark';

  const value: ThemeContextType = {
    colorScheme,
    colors: isDark ? colors.dark : colors.light,
    shadows: isDark ? shadows.dark : shadows.light,
    spacing,
    radius,
    layout,
    isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export a hook for getting just the colors
export function useColors(): ThemeColors {
  return useTheme().colors;
}

// Export a hook for checking dark mode
export function useIsDark(): boolean {
  return useTheme().isDark;
}

