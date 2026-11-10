import React from 'react';
import {
  Menu,
  Play,
  Upload,
  Search,
  Database,
} from 'lucide-react';
import { WorkbenchView } from './Sidebar';

interface TopBarProps {
  onToggleSidebarMobile: () => void;
  currentView: WorkbenchView;
  datasets: Array<{ id: string; name: string }>;
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onUploadClick: () => void;
  onOpenCommandPalette: () => void;
  apiConnected: boolean;
}

const VIEW_TITLES: Record<WorkbenchView, string> = {
  overview: 'Overview',
  datasets: 'Datasets & Preprocessing',
  explorer: 'Signal Explorer',
  statistics: 'Statistics Lab',
  spectra: 'Spectral Lab',
  timefreq: 'Time-Frequency Lab',
  anomalies: 'Anomalies & Change-points',
  dynamics: 'Dynamics & Structure',
  relations: 'Relations Lab',
  inference: 'Inference & Null Models',
  findings: 'Scientific Findings',
  evidence: 'Evidence Graph',
  reproducibility: 'Reproducibility & Manifests',
  benchmarks: 'Benchmark Scoreboard',
  methods: 'Methods Library',
};

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebarMobile,
  currentView,
  datasets,
  selectedDatasetId,
  onSelectDataset,
  isAnalyzing,
  onRunAnalysis,
  onUploadClick,
  onOpenCommandPalette,
  apiConnected,
}) => {
  return (
    <header className="h-13 surface-base border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between gap-3 shrink-0 select-none z-10">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2 overflow-hidden">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 rounded-md text-secondary hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-muted truncate">
          <span className="font-semibold text-primary font-mono hidden sm:inline">SYNAPSE</span>
          <span className="text-slate-400 hidden sm:inline">/</span>
          <span className="text-primary font-medium truncate">{VIEW_TITLES[currentView] || currentView}</span>
        </div>
      </div>

      {/* Center: Dataset Selector */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border surface-subtle text-xs">
          <Database className="w-3.5 h-3.5 text-muted" />
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-primary focus:outline-none cursor-pointer pr-4"
            aria-label="Active Dataset"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls: Command palette, Upload, Run, API chip */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-muted surface-subtle border rounded-md hover:text-primary hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          title="Command Palette (Ctrl/Cmd + K)"
          aria-label="Search and command palette"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-slate-200 dark:bg-slate-800 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium surface-subtle border text-secondary hover:text-primary rounded-md transition-colors"
          title="Upload signal file"
        >
          <Upload className="w-3.5 h-3.5 text-muted" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Run Analysis Button */}
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md shadow-xs transition-colors ${
            isAnalyzing
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Computing...' : 'Run analysis'}</span>
        </button>

        {/* API Status Chip */}
        <div
          className={`hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border rounded-full ${
            apiConnected
              ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-300 dark:bg-emerald-950/40'
              : 'border-slate-200 text-slate-500 bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:bg-slate-900'
          }`}
          title={apiConnected ? 'FastAPI Gateway: Connected (127.0.0.1:8000)' : 'Client Standalone Numerical Engine'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span>{apiConnected ? 'API OK' : 'LOCAL'}</span>
        </div>
      </div>
    </header>
  );
};
