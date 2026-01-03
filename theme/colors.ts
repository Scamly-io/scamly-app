/**
 * Color tokens for light and dark themes
 * Uses a refined violet accent with neutral backgrounds
 */

export const colors = {
  light: {
    // Backgrounds
    background: '#FAFAFA',
    backgroundSecondary: '#F5F5F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text
    textPrimary: '#1A1A1F',
    textSecondary: '#6B6B76',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    
    // Accent
    accent: '#7C5CFC',
    accentSecondary: '#A78BFA',
    accentMuted: 'rgba(124, 92, 252, 0.12)',
    accentLight: 'rgba(124, 92, 252, 0.08)',
    
    // Borders & Dividers
    border: 'rgba(0, 0, 0, 0.06)',
    borderStrong: 'rgba(0, 0, 0, 0.12)',
    divider: 'rgba(0, 0, 0, 0.04)',
    
    // Status Colors
    success: '#22C55E',
    successMuted: 'rgba(34, 197, 94, 0.12)',
    warning: '#F59E0B',
    warningMuted: 'rgba(245, 158, 11, 0.12)',
    error: '#EF4444',
    errorMuted: 'rgba(239, 68, 68, 0.12)',
    
    // Interactive
    pressedOverlay: 'rgba(0, 0, 0, 0.04)',
    
    // Tab Bar
    tabBar: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: 'rgba(0, 0, 0, 0.06)',
    tabActive: '#7C5CFC',
    tabInactive: '#9CA3AF',
  },
  
  dark: {
    // Backgrounds
    background: '#0F0F14',
    backgroundSecondary: '#16161D',
    surface: '#1A1A22',
    surfaceElevated: '#222230',
    
    // Text
    textPrimary: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    textInverse: '#1A1A1F',
    
    // Accent
    accent: '#A78BFA',
    accentSecondary: '#7C5CFC',
    accentMuted: 'rgba(167, 139, 250, 0.16)',
    accentLight: 'rgba(167, 139, 250, 0.08)',
    
    // Borders & Dividers
    border: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.14)',
    divider: 'rgba(255, 255, 255, 0.04)',
    
    // Status Colors
    success: '#4ADE80',
    successMuted: 'rgba(74, 222, 128, 0.16)',
    warning: '#FBBF24',
    warningMuted: 'rgba(251, 191, 36, 0.16)',
    error: '#F87171',
    errorMuted: 'rgba(248, 113, 113, 0.16)',
    
    // Interactive
    pressedOverlay: 'rgba(255, 255, 255, 0.04)',
    
    // Tab Bar
    tabBar: 'rgba(15, 15, 20, 0.92)',
    tabBarBorder: 'rgba(255, 255, 255, 0.08)',
    tabActive: '#A78BFA',
    tabInactive: '#71717A',
  },
} as const;

export type ThemeColors = typeof colors.light;
export type ColorScheme = 'light' | 'dark';

