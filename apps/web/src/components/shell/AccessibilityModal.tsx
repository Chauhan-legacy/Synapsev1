import React from 'react';
import { X, RotateCcw, Sliders, Eye } from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { AppTheme, TextSize, LineSpacing, Density } from '../../types/accessibility';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings, resetSettings, palette } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-2xl surface-base border rounded-lg shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Accessibility & Display Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b surface-subtle">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-primary">Accessibility & Display Preferences</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-primary"
            aria-label="Close accessibility settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
          {/* Live Preview Box */}
          <div className="p-3 border rounded surface-subtle space-y-2">
            <div className="flex items-center gap-1.5 font-medium text-primary">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Visual Preview</span>
            </div>
            <p className="text-secondary leading-relaxed">
              This preview reflects your current theme, typography, line spacing, and density preferences in real time.
            </p>
            {/* Color Palette Preview */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-muted font-mono text-[11px]">Active Palette:</span>
              <div className="flex items-center gap-1">
                {palette.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-4 h-4 rounded-sm border border-slate-300 dark:border-slate-700 inline-block"
                    style={{ backgroundColor: color }}
                    title={`Color ${idx + 1}: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-primary uppercase text-[10px] tracking-wider">
              Theme / Appearance
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['light', 'dark', 'high-contrast', 'system'] as AppTheme[]).map((thm) => (
                <button
                  key={thm}
                  type="button"
                  onClick={() => updateSettings({ theme: thm })}
                  className={`py-2 px-3 rounded border text-center font-medium capitalize transition-colors ${
                    settings.theme === thm
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'surface-base border text-secondary hover:text-primary'
                  }`}
                >
                  {thm === 'dark' ? 'Dark Charcoal' : thm.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Text Size (4 steps) */}
          <div className="space-y-1.5">
            <label className="font-semibold text-primary uppercase text-[10px] tracking-wider">
              Text Scaling (4 Steps)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['sm', 'md', 'lg', 'xl'] as TextSize[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateSettings({ textSize: sz })}
                  className={`py-2 px-3 rounded border text-center font-medium uppercase font-mono transition-colors ${
                    settings.textSize === sz
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'surface-base border text-secondary hover:text-primary'
                  }`}
                >
                  {sz === 'sm' ? 'Small' : sz === 'md' ? 'Default' : sz === 'lg' ? 'Large' : 'X-Large'}
                </button>
              ))}
            </div>
          </div>

          {/* Line Spacing & Density */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                Line Spacing
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'relaxed'] as LineSpacing[]).map((ls) => (
                  <button
                    key={ls}
                    type="button"
                    onClick={() => updateSettings({ lineSpacing: ls })}
                    className={`py-1.5 px-3 rounded border text-center capitalize ${
                      settings.lineSpacing === ls
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'surface-base border text-secondary'
                    }`}
                  >
                    {ls}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                Layout Density
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['compact', 'comfortable'] as Density[]).map((den) => (
                  <button
                    key={den}
                    type="button"
                    onClick={() => updateSettings({ density: den })}
                    className={`py-1.5 px-3 rounded border text-center capitalize ${
                      settings.density === den
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'surface-base border text-secondary'
                    }`}
                  >
                    {den}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Colorblind Palette & Toggles */}
          <div className="space-y-3 pt-2 border-t">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium text-primary">
                Okabe-Ito 8-Color Colorblind-Safe Chart Palette
              </span>
              <input
                type="checkbox"
                checked={settings.colorBlindSafe}
                onChange={(e) => updateSettings({ colorBlindSafe: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium text-primary">Dyslexia-Friendly Typography</span>
              <input
                type="checkbox"
                checked={settings.dyslexiaFont}
                onChange={(e) => updateSettings({ dyslexiaFont: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium text-primary">Always Visible Focus Rings (WCAG 2.2 AA)</span>
              <input
                type="checkbox"
                checked={settings.alwaysShowFocusRings}
                onChange={(e) => updateSettings({ alwaysShowFocusRings: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium text-primary">Large Touch / Click Targets (Min 44px)</span>
              <input
                type="checkbox"
                checked={settings.largeClickTargets}
                onChange={(e) => updateSettings({ largeClickTargets: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-medium text-primary">Reduce Animations & Motion</span>
              <input
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={(e) => updateSettings({ reduceMotion: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t surface-subtle">
          <button
            type="button"
            onClick={resetSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded surface-base border text-muted hover:text-primary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
