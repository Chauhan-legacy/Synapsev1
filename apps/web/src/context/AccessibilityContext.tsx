import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AccessibilitySettings,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  COLORBLIND_PALETTE,
  STANDARD_PALETTE
} from '../types/accessibility';

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  palette: string[];
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('synapse_a11y_v2');
      if (saved) {
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed reading a11y preferences', e);
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  });

  const updateSettings = (partial: Partial<AccessibilitySettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem('synapse_a11y_v2', JSON.stringify(next));
      } catch (e) {
        console.error('Failed saving a11y preferences', e);
      }
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    try {
      localStorage.removeItem('synapse_a11y_v2');
    } catch (e) {
      console.error('Failed resetting a11y preferences', e);
    }
  };

  // Sync settings with DOM attributes and root classes
  useEffect(() => {
    const root = document.documentElement;

    // Text size
    root.setAttribute('data-text-size', settings.textSize);
    root.setAttribute('data-line-spacing', settings.lineSpacing);
    root.setAttribute('data-density', settings.density);

    // Dyslexia font
    if (settings.dyslexiaFont) {
      root.classList.add('dyslexia-font');
    } else {
      root.classList.remove('dyslexia-font');
    }

    // Focus rings
    if (settings.alwaysShowFocusRings) {
      root.classList.add('always-focus-rings');
    } else {
      root.classList.remove('always-focus-rings');
    }

    // Large click targets
    if (settings.largeClickTargets) {
      root.classList.add('large-targets');
    } else {
      root.classList.remove('large-targets');
    }
  }, [settings]);

  const palette = settings.colorBlindSafe ? COLORBLIND_PALETTE : STANDARD_PALETTE;

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings, resetSettings, palette }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return ctx;
};

