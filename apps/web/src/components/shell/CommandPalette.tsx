import React, { useState, useEffect, useRef } from 'react';
import { Search, Navigation, Play, Database, SunMoon, FileText, BookOpen, X } from 'lucide-react';
import { WorkbenchView } from './Sidebar';
import { useAccessibility } from '../../context/AccessibilityContext';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Actions' | 'Datasets' | 'Theme' | 'Reference';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: WorkbenchView) => void;
  onRunAnalysis: () => void;
  datasets: Array<{ id: string; name: string }>;
  onSelectDataset: (id: string) => void;
  onExportReport: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onRunAnalysis,
  datasets,
  onSelectDataset,
  onExportReport,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { settings, updateSettings } = useAccessibility();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global key listener for Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open handled by parent
        }
      }
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allCommands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Go to Overview',
      subtitle: 'Key signal metrics and executive summary',
      icon: Navigation,
      action: () => onNavigate('overview'),
    },
    {
      id: 'nav-datasets',
      category: 'Navigation',
      title: 'Go to Datasets & Preprocessing',
      subtitle: 'Inspect signals, check data quality, apply filters',
      icon: Navigation,
      action: () => onNavigate('datasets'),
    },
    {
      id: 'nav-explorer',
      category: 'Navigation',
      title: 'Go to Signal Explorer',
      subtitle: 'Zoom, pan, brush select, channel overlay',
      icon: Navigation,
      action: () => onNavigate('explorer'),
    },
    {
      id: 'nav-spectra',
      category: 'Navigation',
      title: 'Go to Spectral Lab',
      subtitle: 'Welch PSD, Multitaper DPSS, Lomb-Scargle, CRLB peak fit',
      icon: Navigation,
      action: () => onNavigate('spectra'),
    },
    {
      id: 'nav-timefreq',
      category: 'Navigation',
      title: 'Go to Time-Frequency Lab',
      subtitle: 'STFT, CWT Morlet scalogram, Hilbert transform, chirp ridges',
      icon: Navigation,
      action: () => onNavigate('timefreq'),
    },
    {
      id: 'nav-statistics',
      category: 'Navigation',
      title: 'Go to Statistics Lab',
      subtitle: 'ADF/KPSS stationarity, Jarque-Bera, DFA, Hurst exponent',
      icon: Navigation,
      action: () => onNavigate('statistics'),
    },
    {
      id: 'nav-anomalies',
      category: 'Navigation',
      title: 'Go to Anomalies & Change-points',
      subtitle: 'Rosner ESD, Matrix profile discords, PELT, BOCPD heatmap',
      icon: Navigation,
      action: () => onNavigate('anomalies'),
    },
    {
      id: 'nav-dynamics',
      category: 'Navigation',
      title: 'Go to Dynamics & Structure',
      subtitle: 'AMI delay, FNN dimension, RQA, Sample entropy, Lyapunov',
      icon: Navigation,
      action: () => onNavigate('dynamics'),
    },
    {
      id: 'nav-relations',
      category: 'Navigation',
      title: 'Go to Relations Lab',
      subtitle: 'Granger causality, Transfer entropy, KSG MI, DTW, FastICA',
      icon: Navigation,
      action: () => onNavigate('relations'),
    },
    {
      id: 'nav-inference',
      category: 'Navigation',
      title: 'Go to Inference & Null Models',
      subtitle: 'IAAFT surrogates, BCa bootstrap, FDR multiple-testing',
      icon: Navigation,
      action: () => onNavigate('inference'),
    },
    {
      id: 'nav-findings',
      category: 'Navigation',
      title: 'Go to Scientific Findings',
      subtitle: 'Ranked candidate and validated discoveries',
      icon: Navigation,
      action: () => onNavigate('findings'),
    },
    {
      id: 'nav-benchmarks',
      category: 'Navigation',
      title: 'Go to Benchmarks Scoreboard',
      subtitle: 'Synthetic Datasets A to J recovery validation',
      icon: Navigation,
      action: () => onNavigate('benchmarks'),
    },
    {
      id: 'nav-methods',
      category: 'Navigation',
      title: 'Go to Methods Library',
      subtitle: 'Searchable method cards with KaTeX formulas and references',
      icon: BookOpen,
      action: () => onNavigate('methods'),
    },

    // Actions
    {
      id: 'action-run',
      category: 'Actions',
      title: 'Execute Full Analysis Pipeline',
      subtitle: 'Run complete discovery orchestrator on current signal',
      icon: Play,
      action: onRunAnalysis,
    },
    {
      id: 'action-report',
      category: 'Actions',
      title: 'Export Investigation Report (HTML/PDF)',
      subtitle: 'Generate verifiable scientific report with SHA-256 manifest',
      icon: FileText,
      action: onExportReport,
    },

    // Themes
    {
      id: 'theme-toggle',
      category: 'Theme',
      title: 'Toggle Theme (Light / Dark Charcoal / High-Contrast)',
      subtitle: `Current theme: ${settings.theme}`,
      icon: SunMoon,
      action: () => {
        const nextTheme = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'high-contrast' : 'light';
        updateSettings({ theme: nextTheme });
      },
    },

    // Datasets
    ...datasets.map((d) => ({
      id: `ds-${d.id}`,
      category: 'Datasets' as const,
      title: `Switch Dataset: ${d.name}`,
      subtitle: `ID: ${d.id}`,
      icon: Database,
      action: () => onSelectDataset(d.id),
    })),
  ];

  const filteredCommands = allCommands.filter((c) => {
    const text = `${c.title} ${c.subtitle || ''} ${c.category}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-xl surface-base border rounded-lg shadow-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-600"
        role="dialog"
        aria-modal="true"
        aria-label="Command Palette"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3 py-3 border-b">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, page name, or dataset..."
            className="w-full bg-transparent border-none text-sm text-primary focus:outline-none"
            aria-autocomplete="list"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-primary rounded"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No matching commands or pages found for "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                    <div className="truncate">
                      <div className="font-medium truncate">{cmd.title}</div>
                      {cmd.subtitle && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-muted'}`}>
                          {cmd.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-blue-700 text-white' : 'surface-subtle text-muted'
                    }`}
                  >
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-3 py-2 border-t surface-subtle flex items-center justify-between text-[11px] text-muted font-mono">
          <span>Navigate with <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Execute with <kbd>↵</kbd></span>
          <span>Close with <kbd>ESC</kbd></span>
        </div>
      </div>
    </div>
  );
};
