import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Play,
  Upload,
  Search,
  Database,
  Trash2,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { WorkbenchView } from './Sidebar';

interface TopBarProps {
  onToggleSidebarMobile: () => void;
  currentView: WorkbenchView;
  datasets: Array<{ id: string; name: string; isCustom?: boolean }>;
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onDeleteDataset?: (id: string) => void;
  onRestoreDatasets?: () => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onUploadClick: () => void;
  onOpenCommandPalette: () => void;
  apiConnected: boolean;
}

const VIEW_TITLES: Record<WorkbenchView, string> = {
  workbench: 'Paper Workbench',
  papergraph: 'PaperGraph Citations',
  papergraph_rack: 'PaperGraph Rack & Graphify Workspace',
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
  astronomy: 'Astronomy & Cosmic Lab',
  physics: 'Physics & Nuclear Lab',
  biosignals: 'Bio & Neuro Signals (Dim 1)',
  chaos: 'Chaos & Nonlinear Dynamics (Dim 3)',
  earth_systems: 'Earth & Tidal Systems (Dim 4)',
  quantum: 'Quantum & Spectroscopy (Dim 5)',
  feynman: 'Feynman Pedagogical Lab (Dim 6)',
  satellite: 'Satellite Systems Lab',
  geophysics: 'Earth & Geophysics Lab',
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
  onRestoreDatasets,
  isAnalyzing,
  onRunAnalysis,
  onUploadClick,
  onOpenCommandPalette,
  apiConnected,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  return (
    <header className="h-14 bg-[#FFFFFF] border-b border-[#DDD6C7] px-4 flex items-center justify-between gap-3 shrink-0 select-none z-20 sticky top-0 text-[#1F2430]">
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

      {/* Center: Integrated Dataset Selector Dropdown with in-menu Delete */}
      <div className="hidden md:block relative" ref={dropdownRef}>
        <div className="flex items-center rounded-md border border-[#DDD6C7] bg-[#EFEBE0] text-xs font-mono transition-colors hover:border-[#0F766E]/40 shadow-2xs">
          {/* Main Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1F2430] focus:outline-none max-w-[260px] lg:max-w-[340px] truncate"
            title={currentDataset?.name || 'Select dataset'}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <Database className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
            <span className="truncate">{currentDataset?.name || 'Select dataset...'}</span>
            <ChevronDown className={`w-3 h-3 text-[#6B6F7B] shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Custom Dropdown Menu with in-row Delete Buttons */}
        {isDropdownOpen && (
          <div className="absolute left-0 mt-1 w-80 bg-[#FFFFFF] border border-[#DDD6C7] rounded-md shadow-lg py-1 z-50 font-mono text-xs max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#6B6F7B] tracking-wider border-b border-[#DDD6C7] flex items-center justify-between bg-[#F8F6F1]">
              <span>Active &amp; Available Signals ({datasets.length})</span>
              {onRestoreDatasets && (
                <button
                  type="button"
                  onClick={() => {
                    onRestoreDatasets();
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 text-[10px] text-[#0F766E] hover:underline normal-case font-medium"
                  title="Reset to default benchmark presets"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset defaults</span>
                </button>
              )}
            </div>

            <div className="py-1">
              {datasets.map((ds) => {
                const isSelected = ds.id === selectedDatasetId;
                return (
                  <div
                    key={ds.id}
                    onClick={() => {
                      onSelectDataset(ds.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-[#EFEBE0] text-[#1F2430] font-semibold'
                        : 'hover:bg-[#F6F3EC] text-[#4A5060]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#0F766E]' : 'bg-[#DDD6C7]'}`} />
                      <span className="truncate">{ds.name}</span>
                    </div>

                    {/* Delete button inside each dropdown row */}
                    {onDeleteDataset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDataset(ds.id);
                        }}
                        className="opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-[#FDEDEC] text-[#6B6F7B] hover:text-[#C0392B] transition-all shrink-0"
                        title={`Delete ${ds.name}`}
                        aria-label={`Delete ${ds.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-mono font-semibold rounded-md shadow-xs transition-colors ${
            isAnalyzing
              ? 'bg-[#0F766E]/70 text-white cursor-wait'
              : 'bg-[#0F766E] hover:bg-[#0B5E58] text-white'
          }`}
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isAnalyzing ? 'Computing...' : 'Run analysis'}</span>
          <span className="sm:hidden">{isAnalyzing ? '...' : 'Run'}</span>
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
