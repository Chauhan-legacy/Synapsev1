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
  ArrowLeft,
} from 'lucide-react';
import { WorkbenchView } from './Sidebar';

interface TopBarProps {
  onToggleSidebarMobile: () => void;
  currentView: WorkbenchView;
  datasets: Array<{ id: string; name: string; isCustom?: boolean; isBenchmark?: boolean }>;
  selectedDatasetId: string;
  onSelectDataset: (id: string) => void;
  onDeleteDataset?: (id: string) => void;
  onRestoreDatasets?: () => void;
  isAnalyzing: boolean;
  onRunAnalysis: () => void;
  onUploadClick: () => void;
  onOpenCommandPalette: () => void;
  apiConnected: boolean;
  onSwitchToWorkbench?: () => void;
}

const VIEW_TITLES: Record<WorkbenchView, string> = {
  workbench: 'Paper Workbench',
  aporia: 'Synthesized Thoughts',
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
  cdco: 'Cross-Dataset Observatory',
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
  onSwitchToWorkbench,
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
    <header className="h-14 bg-[#F7F5EF] border-b border-[#252925]/20 px-4 flex items-center justify-between gap-3 shrink-0 select-none z-20 sticky top-0 text-[#252925]">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <button
          type="button"
          onClick={onToggleSidebarMobile}
          className="lg:hidden p-1.5 rounded-md text-[#252925]/70 hover:text-[#252925] hover:bg-[#9CAF88]/20"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs font-georgia text-[#252925] truncate">
          <span className="font-bold text-[#252925] hidden sm:inline">SYNAPSE</span>
          <span className="text-[#252925]/40 hidden sm:inline">/</span>
          <span className="text-[#252925] font-semibold truncate">{VIEW_TITLES[currentView] || currentView}</span>
        </div>
      </div>

      {/* Center: Integrated Dataset Selector Dropdown with in-menu Delete */}
      <div className="hidden md:block relative" ref={dropdownRef}>
        <div className="flex items-center rounded-md border border-[#252925]/30 bg-[#FFFFFF] text-xs font-georgia transition-colors hover:border-[#252925] shadow-2xs">
          {/* Main Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#252925] focus:outline-none max-w-[260px] lg:max-w-[340px] truncate"
            title={currentDataset?.name || 'Select dataset'}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <Database className="w-3.5 h-3.5 text-[#252925] shrink-0" />
            <span className="truncate">{currentDataset?.name || 'Select dataset...'}</span>
            <ChevronDown className={`w-3 h-3 text-[#252925]/70 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Custom Dropdown Menu with in-row Delete Buttons */}
        {isDropdownOpen && (
          <div className="absolute left-0 mt-1 w-80 bg-[#FFFFFF] border border-[#252925]/30 rounded-md shadow-lg py-1 z-50 font-mono text-xs max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#252925]/80 tracking-wider border-b border-[#252925]/20 flex items-center justify-between bg-[#F7F5EF]">
              <span>Active &amp; Available Signals ({datasets.length})</span>
              {onRestoreDatasets && (
                <button
                  type="button"
                  onClick={() => {
                    onRestoreDatasets();
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 text-[10px] text-[#E8412C] hover:underline normal-case font-medium"
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
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group ${isSelected
                      ? 'bg-[#9CAF88]/20 text-[#252925] font-semibold'
                      : 'hover:bg-[#F7F5EF] text-[#252925]'
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-[#E8412C]' : 'bg-[#252925]/30'}`} />
                      <span className="truncate">{ds.name}</span>
                      {ds.isBenchmark && (
                        <span className="px-1 py-0.5 rounded text-[8px] font-mono uppercase bg-[#F7F5EF] text-[#252925]/80 border border-[#252925]/20 shrink-0 font-sans">
                          Example / simulator
                        </span>
                      )}
                    </div>

                    {/* Delete button inside each dropdown row */}
                    {onDeleteDataset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDataset(ds.id);
                        }}
                        className="opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-[#F7F5EF] text-[#252925]/70 hover:text-[#E8412C] transition-all shrink-0"
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
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-[#252925] bg-[#FFFFFF] border border-[#252925]/30 rounded-md hover:border-[#252925] transition-colors font-georgia"
          title="Command Palette (Ctrl/Cmd + K)"
          aria-label="Search and command palette"
        >
          <Search className="w-3.5 h-3.5 text-[#252925]" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-[#F7F5EF] text-[#252925] border border-[#252925]/30 rounded">
            ⌘K
          </kbd>
        </button>

        {/* Upload Button */}
        <button
          type="button"
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-georgia font-semibold bg-[#FFFFFF] border border-[#252925]/30 text-[#252925] hover:border-[#252925] rounded-md transition-colors"
          title="Upload signal file"
        >
          <Upload className="w-3.5 h-3.5 text-[#252925]" />
          <span className="hidden sm:inline">Upload CSV</span>
        </button>

        {/* Run Analysis Button (10% Signal Red Interactive Accent) */}
        <button
          type="button"
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-georgia font-bold rounded-md shadow-xs transition-colors ${isAnalyzing
            ? 'bg-[#E8412C]/70 text-[#FFFFFF] cursor-wait'
            : 'bg-[#E8412C] hover:bg-[#D03522] text-[#FFFFFF]'
            }`}
        >
          <Play className={`w-3.5 h-3.5 fill-current ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isAnalyzing ? 'Computing...' : 'Run analysis'}</span>
          <span className="sm:hidden">{isAnalyzing ? '...' : 'Run'}</span>
        </button>

        {/* API Status Chip */}
        <div
          className={`hidden sm:flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono border rounded-full ${apiConnected
            ? 'border-[#252925]/40 text-[#252925] bg-[#FFFFFF] font-bold'
            : 'border-[#252925]/20 text-[#252925]/60 bg-[#F7F5EF]'
            }`}
          title={apiConnected ? 'FastAPI Gateway: Connected (127.0.0.1:8000)' : 'Client Standalone Numerical Engine'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-[#9CAF88]' : 'bg-[#252925]/40'}`} />
          <span>{apiConnected ? 'API OK' : 'LOCAL'}</span>
        </div>

        {/* Switch to Paper Workbench Button */}
        {onSwitchToWorkbench && (
          <button
            type="button"
            onClick={onSwitchToWorkbench}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-georgia font-semibold rounded-md border border-[#252925]/30 bg-[#FFFFFF] hover:bg-[#9CAF88]/20 hover:border-[#252925] text-[#252925] transition-colors shadow-2xs group shrink-0"
            title="Switch to Paper Workbench"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#252925] transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden xl:inline">Switch to Paper Workbench</span>
            <span className="xl:hidden hidden sm:inline">Workbench</span>
          </button>
        )}
      </div>
    </header>
  );
};
