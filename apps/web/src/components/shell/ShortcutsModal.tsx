import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette (search, jump to page, run)' },
    { key: '?', desc: 'Show this keyboard shortcuts map' },
    { key: 'Esc', desc: 'Close any active dialog, drawer, or modal' },
    { key: 'Double Click', desc: 'Reset zoom on any interactive chart' },
    { key: 'Mouse Wheel', desc: 'Zoom into hovered region on charts' },
    { key: 'Tab / Shift + Tab', desc: 'Navigate interactive focus landmarks' },
    { key: 'Enter / Space', desc: 'Activate selected button or toggle' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md surface-base border rounded-lg shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard Shortcuts"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b surface-subtle">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-primary">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-primary"
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {shortcuts.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <span className="text-secondary">{s.desc}</span>
                <kbd className="px-2 py-0.5 font-mono text-[11px] surface-subtle border rounded font-semibold text-primary">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 py-3 border-t surface-subtle text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
