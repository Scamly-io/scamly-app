/**
 * Cross-platform shadow definitions using boxShadow.
 * Works consistently on both iOS and Android (RN 0.76+ with new architecture).
 */

type ShadowStyle = {
  boxShadow: string;
};

const createShadow = (
  offsetY: number,
  blur: number,
  opacity: number,
  isDark: boolean = false
): ShadowStyle => ({
  boxShadow: `0px ${offsetY}px ${blur}px rgba(0, 0, 0, ${isDark ? opacity * 1.5 : opacity})`,
});

export const shadows = {
  light: {
    none: createShadow(0, 0, 0),
    sm: createShadow(1, 2, 0.04),
    md: createShadow(2, 8, 0.06),
    lg: createShadow(4, 16, 0.08),
    xl: createShadow(8, 24, 0.10),
  },
  dark: {
    none: createShadow(0, 0, 0, true),
    sm: createShadow(1, 2, 0.2, true),
    md: createShadow(2, 8, 0.3, true),
    lg: createShadow(4, 16, 0.4, true),
    xl: createShadow(8, 24, 0.5, true),
  },
} as const;

export type ShadowSize = keyof typeof shadows.light;

