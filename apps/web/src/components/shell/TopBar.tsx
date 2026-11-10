import React from 'react';
import {
  Menu,
  Play,
  Upload,
  Search,
  Database,
  Trash2,
} from 'lucide-react';
import { WorkbenchView } from './Sidebar';

interface TopBarProps {
  onToggleSidebarMobile: () => void;
  currentView: WorkbenchView;
  datasets: Array<{ id: string; name: string; isCustom?: boolean }>;
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onDeleteDataset?: (id: string) => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onUploadClick: () => void;
  onOpenCommandPalette: () => void;
  apiConnected: boolean;
}

const VIEW_TITLES: Record<WorkbenchView, string> = {
  overview: 'Overview',
  rack: 'Full Instrument Rack',
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
  onDeleteDataset,
  isAnalyzing,
  onRunAnalysis,
  onUploadClick,
  onOpenCommandPalette,
  apiConnected,
}) => {
  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#DDD6C7] px-4 flex items-center justify-between gap-3 shrink-0 select-none z-10 sticky top-0 text-[#1F2430]">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 rounded-md text-[#6B6F7B] hover:text-[#1F2430] hover:bg-[#EFEBE0]"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-[#6B6F7B] truncate">
          <span className="font-bold text-[#1F2430] hidden sm:inline">SYNAPSE</span>
          <span className="text-[#DDD6C7] hidden sm:inline">/</span>
          <span className="text-[#1F2430] font-semibold truncate">{VIEW_TITLES[currentView] || currentView}</span>
        </div>
      </div>

      {/* Center: Dataset Selector & Delete Button */}
      <div className="hidden md:flex items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#DDD6C7] bg-[#EFEBE0] text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-[#1F2430] focus:outline-none cursor-pointer pr-3 font-mono max-w-[220px] lg:max-w-[290px] truncate"
            aria-label="Active Dataset"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>

        {onDeleteDataset && datasets.length > 0 && (
          <button
            type="button"
            onClick={() => onDeleteDataset(selectedDatasetId)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-[#C0392B] bg-[#FFFFFF] hover:bg-[#FDEDEC] border border-[#DDD6C7] hover:border-[#C0392B] rounded-md transition-colors shadow-2xs"
            title={`Delete ${currentDataset?.name || 'selected dataset'}`}
            aria-label="Delete selected dataset"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#C0392B] shrink-0" />
            <span className="hidden xl:inline">Delete</span>
          </button>
        )}
      </div>

      {/* Right Controls: Command palette, Upload, Run, API chip */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#4A5060] bg-[#EFEBE0] border border-[#DDD6C7] rounded-md hover:text-[#1F2430] transition-colors font-mono"
          title="Command Palette (Ctrl/Cmd + K)"
          aria-label="Search and command palette"
        >
          <Search className="w-3.5 h-3.5 text-[#6B6F7B]" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-[#DDD6C7] rounded">
            ⌘K
          </kbd>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#EFEBE0] border border-[#DDD6C7] text-[#1F2430] hover:bg-[#DDD6C7]/60 rounded-md transition-colors"
          title="Upload signal file"
        >
          <Upload className="w-3.5 h-3.5 text-[#0F766E]" />
          <span className="hidden sm:inline">Upload CSV</span>
        </button>

        {/* Run Analysis Button */}
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-semibold rounded-md shadow-xs transition-colors ${
            isAnalyzing
              ? 'bg-[#0F766E]/70 text-white cursor-wait'
              : 'bg-[#0F766E] hover:bg-[#0B5E58] text-white'
          }`}
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Computing...' : 'Run analysis'}</span>
        </button>

        {/* API Status Chip */}
        <div
          className={`hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border rounded-full ${
            apiConnected
              ? 'border-[#2E7D32]/30 text-[#2E7D32] bg-[#E8F5E9] font-bold'
              : 'border-[#DDD6C7] text-[#6B6F7B] bg-[#EFEBE0]'
          }`}
          title={apiConnected ? 'FastAPI Gateway: Connected (127.0.0.1:8000)' : 'Client Standalone Numerical Engine'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-[#2E7D32]' : 'bg-[#6B6F7B]'}`} />
          <span>{apiConnected ? 'API OK' : 'LOCAL'}</span>
        </div>
      </div>
    </header>
  );
};
