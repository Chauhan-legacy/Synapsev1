export type AppTheme = 'light' | 'dark' | 'high-contrast' | 'system';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type LineSpacing = 'normal' | 'relaxed';
export type Density = 'compact' | 'comfortable';

export interface AccessibilitySettings {
  theme: AppTheme;
  textSize: TextSize;
  lineSpacing: LineSpacing;
  density: Density;
  colorBlindSafe: boolean;
  reduceMotion: boolean;
  largeClickTargets: boolean;
  alwaysShowFocusRings: boolean;
  dyslexiaFont: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  theme: 'light',
  textSize: 'md',
  lineSpacing: 'normal',
  density: 'comfortable',
  colorBlindSafe: true,
  reduceMotion: false,
  largeClickTargets: false,
  alwaysShowFocusRings: true,
  dyslexiaFont: false,
};

// Okabe-Ito 8-color colorblind-safe palette
export const COLORBLIND_PALETTE = [
  '#0072B2', // Blue
  '#E69F00', // Orange
  '#56B4E9', // Sky Blue
  '#009E73', // Bluish Green
  '#F0E442', // Yellow
  '#D55E00', // Vermilion
  '#CC79A7', // Reddish Purple
  '#222222', // Charcoal Dark
];

export const STANDARD_PALETTE = [
  '#2563EB', // Blue 600
  '#0D9488', // Teal 600
  '#D97706', // Amber 600
  '#DC2626', // Red 600
  '#7C3AED', // Violet 600
  '#059669', // Emerald 600
  '#DB2777', // Pink 600
  '#475569', // Slate 600
];
