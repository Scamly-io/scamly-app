import { Platform } from 'react-native';

/**
 * Platform-aware shadow definitions
 * iOS uses shadow properties, Android uses elevation
 */

type ShadowStyle = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const createShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  elevation: number,
  isDark: boolean = false
): ShadowStyle => ({
  shadowColor: isDark ? '#000000' : '#000000',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: isDark ? opacity * 1.5 : opacity,
  shadowRadius: blur,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  light: {
    none: createShadow(0, 0, 0, 0),
    sm: createShadow(1, 2, 0.04, 1),
    md: createShadow(2, 8, 0.06, 3),
    lg: createShadow(4, 16, 0.08, 6),
    xl: createShadow(8, 24, 0.10, 10),
  },
  dark: {
    none: createShadow(0, 0, 0, 0, true),
    sm: createShadow(1, 2, 0.2, 1, true),
    md: createShadow(2, 8, 0.3, 3, true),
    lg: createShadow(4, 16, 0.4, 6, true),
    xl: createShadow(8, 24, 0.5, 10, true),
  },
} as const;

export type ShadowSize = keyof typeof shadows.light;

