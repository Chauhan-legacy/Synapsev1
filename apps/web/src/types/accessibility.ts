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

// Scientific Colorblind-Safe Palette (Ink Black Primary, Zero Neon)
export const COLORBLIND_PALETTE = [
  '#10141C', // Ink Black (Primary trace)
  '#706E6B', // Charcoal Slate
  '#B45F1B', // Amber Umber
  '#2F7D4F', // Muted Sage
  '#4F8A8B', // Slate Teal
  '#D55E00', // Vermilion Earth
  '#5C5569', // Muted Plum
  '#3F5E78', // Slate Navy
];

// Scholarly Restrained Standard Palette (Ink Black Primary)
export const STANDARD_PALETTE = [
  '#10141C', // Ink Black (Primary trace)
  '#706E6B', // Graphite
  '#B45F1B', // Amber 500
  '#2F7D4F', // Forest Green
  '#4F8A8B', // Slate Teal
  '#A63A2A', // Brick Earth
  '#5C5569', // Muted Plum
  '#3F5E78', // Slate Navy
];

