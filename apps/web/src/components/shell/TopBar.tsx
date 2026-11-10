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
  const activeIsCustom = datasets.find((d) => d.id === selectedDatasetId)?.isCustom;

  return (
    <header className="h-14 bg-[#FFFDF9] border-b border-[#E6E1D6] px-4 flex items-center justify-between gap-3 shrink-0 select-none z-10 sticky top-0 text-[#10141C]">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 rounded-md text-[#57534E] hover:text-[#10141C] hover:bg-[#F2EFE9]"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-[#78716C] truncate">
          <span className="font-bold text-[#10141C] hidden sm:inline">SYNAPSE</span>
          <span className="text-[#A8A29E] hidden sm:inline">/</span>
          <span className="text-[#10141C] font-semibold truncate">{VIEW_TITLES[currentView] || currentView}</span>
        </div>
      </div>

      {/* Center: Dataset Selector */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E6E1D6] bg-[#F2EFE9] text-xs font-mono">
          <Database className="w-3.5 h-3.5 text-[#B45F1B]" />
          <select
            value={selectedDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="bg-transparent border-none text-xs font-semibold text-[#10141C] focus:outline-none cursor-pointer pr-4 font-mono"
            aria-label="Active Dataset"
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
          {activeIsCustom && onDeleteDataset && (
            <button
              type="button"
              onClick={() => onDeleteDataset(selectedDatasetId)}
              className="p-1 rounded text-[#8C2C1E] hover:bg-[#FBEAE8] transition-colors ml-1"
              title="Delete this custom dataset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Command palette, Upload, Run, API chip */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#57534E] bg-[#F2EFE9] border border-[#E6E1D6] rounded-md hover:text-[#10141C] transition-colors font-mono"
          title="Command Palette (Ctrl/Cmd + K)"
          aria-label="Search and command palette"
        >
          <Search className="w-3.5 h-3.5 text-[#78716C]" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-[#E6E1D6] rounded">
            ⌘K
          </kbd>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium bg-[#F2EFE9] border border-[#E6E1D6] text-[#10141C] hover:bg-[#E6E1D6]/60 rounded-md transition-colors"
          title="Upload signal file"
        >
          <Upload className="w-3.5 h-3.5 text-[#B45F1B]" />
          <span className="hidden sm:inline">Upload CSV</span>
        </button>

        {/* Run Analysis Button */}
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className={`flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-semibold rounded-md shadow-xs transition-colors ${
            isAnalyzing
              ? 'bg-[#2F7D4F]/70 text-white cursor-wait'
              : 'bg-[#2F7D4F] hover:bg-[#25653F] text-white'
          }`}
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Computing...' : 'Run analysis'}</span>
        </button>

        {/* API Status Chip */}
        <div
          className={`hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border rounded-full ${
            apiConnected
              ? 'border-[#2F7D4F]/30 text-[#2F7D4F] bg-[#2F7D4F]/10 font-bold'
              : 'border-[#E6E1D6] text-[#78716C] bg-[#F2EFE9]'
          }`}
          title={apiConnected ? 'FastAPI Gateway: Connected (127.0.0.1:8000)' : 'Client Standalone Numerical Engine'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-[#2F7D4F]' : 'bg-[#78716C]'}`} />
          <span>{apiConnected ? 'API OK' : 'LOCAL'}</span>
        </div>
      </div>
    </header>
  );
};
