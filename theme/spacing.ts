/**
 * Consistent spacing scale for the app
 * Based on 4px base unit
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

/**
 * Border radius tokens
 * Consistent rounded corners throughout the app
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

/**
 * Common layout values
 */
export const layout = {
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;

