export type TextSize = 'sm' | 'md' | 'lg' | 'xl';
export type LineSpacing = 'normal' | 'relaxed';
export type Density = 'compact' | 'comfortable';

export interface AccessibilitySettings {
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
  textSize: 'md',
  lineSpacing: 'normal',
  density: 'comfortable',
  colorBlindSafe: true,
  reduceMotion: false,
  largeClickTargets: false,
  alwaysShowFocusRings: true,
  dyslexiaFont: false,
};

// Strict Section D Colour-Blind Safe Palette (in specified order)
export const COLORBLIND_PALETTE = [
  '#0072B2', // 1: Blue
  '#E69F00', // 2: Orange
  '#009E73', // 3: Green
  '#D55E00', // 4: Vermilion
  '#7B5EA7', // 5: Purple
  '#56B4E9', // 6: Sky
  '#CC79A7', // 7: Pink
  '#B8960C', // 8: Gold
];

export const STANDARD_PALETTE = COLORBLIND_PALETTE;
