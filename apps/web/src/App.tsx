import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { SignalProvider, useSignal } from './context/SignalContext';
import { Sidebar, WorkbenchView } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { CommandPalette } from './components/shell/CommandPalette';
import { AccessibilityModal } from './components/shell/AccessibilityModal';
import { ShortcutsModal } from './components/shell/ShortcutsModal';
import { Compass } from 'lucide-react';

// Lazy-Loaded Views for Fast Initial Bundle
const LandingHero = React.lazy(() =>
  import('./views/LandingHero').then((m) => ({ default: m.LandingHero }))
);
const PaperWorkbench = React.lazy(() =>
  import('./views/PaperWorkbench').then((m) => ({ default: m.PaperWorkbench }))
);

// Advanced Lab Views (Code-split for under 150 kB initial load)
const OverviewView = React.lazy(() =>
  import('./views/OverviewView').then((m) => ({ default: m.OverviewView }))
);
const DatasetsView = React.lazy(() =>
  import('./views/DatasetsView').then((m) => ({ default: m.DatasetsView }))
);
const ExplorerView = React.lazy(() =>
  import('./views/ExplorerView').then((m) => ({ default: m.ExplorerView }))
);
const StatisticsLabView = React.lazy(() =>
  import('./views/StatisticsLabView').then((m) => ({ default: m.StatisticsLabView }))
);
const SpectralLabView = React.lazy(() =>
  import('./views/SpectralLabView').then((m) => ({ default: m.SpectralLabView }))
);
const TimeFreqLabView = React.lazy(() =>
  import('./views/TimeFreqLabView').then((m) => ({ default: m.TimeFreqLabView }))
);
const AnomaliesView = React.lazy(() =>
  import('./views/AnomaliesView').then((m) => ({ default: m.AnomaliesView }))
);
const DynamicsView = React.lazy(() =>
  import('./views/DynamicsView').then((m) => ({ default: m.DynamicsView }))
);
const RelationsView = React.lazy(() =>
  import('./views/RelationsView').then((m) => ({ default: m.RelationsView }))
);
const InferenceView = React.lazy(() =>
  import('./views/InferenceView').then((m) => ({ default: m.InferenceView }))
);
const FindingsView = React.lazy(() =>
  import('./views/FindingsView').then((m) => ({ default: m.FindingsView }))
);
const EvidenceGraphView = React.lazy(() =>
  import('./views/EvidenceGraphView').then((m) => ({ default: m.EvidenceGraphView }))
);
const ReproducibilityView = React.lazy(() =>
  import('./views/ReproducibilityView').then((m) => ({ default: m.ReproducibilityView }))
);
const BenchmarksView = React.lazy(() =>
  import('./views/BenchmarksView').then((m) => ({ default: m.BenchmarksView }))
);
const MethodsLibraryView = React.lazy(() =>
  import('./views/MethodsLibraryView').then((m) => ({ default: m.MethodsLibraryView }))
);

// Minimal Skeleton Loader
const SkeletonLoader: React.FC = () => (
  <div className="w-full h-full min-h-[50vh] p-8 flex flex-col items-center justify-center space-y-4 font-mono text-xs text-[#78716C] bg-[#F8F6F1] animate-pulse">
    <div className="w-10 h-10 rounded-full bg-[#E6E1D6] flex items-center justify-center text-[#10141C]">
      <Compass className="w-5 h-5 animate-spin" />
    </div>
    <div className="tracking-wide">Initializing SYNAPSE Scientific Core...</div>
  </div>
);

const AppInner: React.FC = () => {
  const {
    activeSignal,
    availableDatasets,
    selectDataset,
    loadCustomSignal,
    deleteDataset,
    isAnalyzing,
    runAnalysis,
    currentView,
    setCurrentView,
    moduleStatuses,
    apiConnected,
  } = useSignal();

  // Page Routing: 'hero' (at "/") | 'workbench' (cream paper style) | 'advanced' (14-lab suite)
  const [pageMode, setPageMode] = useState<'hero' | 'workbench' | 'advanced'>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('workbench') || path.includes('workbench')) return 'workbench';
    if (hash.includes('app') || hash.includes('spectra') || hash.includes('benchmarks')) return 'advanced';
    return 'hero';
  });

  // Shell Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [selectedMethodName, setSelectedMethodName] = useState<string | null>(null);

  // File Upload Input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // ?: Keyboard Shortcuts Map
      if (
        e.key === '?' &&
        !['input', 'textarea', 'select'].includes((e.target as HTMLElement).tagName.toLowerCase())
      ) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      }
      // Esc: Close any modal
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsAccessibilityModalOpen(false);
        setIsShortcutsModalOpen(false);
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Method Card Jump Navigation
  const handleOpenMethodCard = useCallback(
    (name: string) => {
      setSelectedMethodName(name);
      setCurrentView('methods');
      setPageMode('advanced');
    },
    [setCurrentView]
  );

  // Real CSV Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return;

      const delimiter = text.includes('\t') ? '\t' : ',';
      const parsedTimes: number[] = [];
      const parsedValues: number[] = [];

      let startIdx = 0;
      const firstParts = lines[0].split(delimiter);
      if (isNaN(Number(firstParts[0].trim()))) {
        startIdx = 1;
      }

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map((p) => Number(p.trim()));
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          parsedTimes.push(parts[0]);
          parsedValues.push(parts[1]);
        } else if (parts.length === 1 && !isNaN(parts[0])) {
          parsedTimes.push(i - startIdx);
          parsedValues.push(parts[0]);
        }
      }

      if (parsedValues.length > 2) {
        let fs = 200;
        if (parsedTimes.length > 1) {
          const dt = (parsedTimes[parsedTimes.length - 1] - parsedTimes[0]) / (parsedTimes.length - 1);
          if (dt > 0) fs = Math.round(1 / dt);
        }

        loadCustomSignal({
          id: `upload_${Date.now()}`,
          filename: file.name,
          samplingRate: fs,
          timestamps: parsedTimes,
          channels: { 'Channel 1': parsedValues },
          channelNames: ['Channel 1'],
          duration: parsedTimes[parsedTimes.length - 1],
          quality: {
            total_samples: parsedValues.length,
            channel_count: 1,
            sampling_rate: fs,
            is_uniform: true,
            timestamp_jitter_pct: 0.0,
            nan_count: 0,
            infinite_count: 0,
            clipping_count: 0,
            content_hash_sha256: `sha256_upload_${file.name}_${parsedValues.length}`,
            warnings: [],
          },
        });

        setPageMode('workbench');
      }
    };
    reader.readAsText(file);
  };

  // Route 1: Landing Hero
  if (pageMode === 'hero') {
    return (
      <Suspense fallback={<SkeletonLoader />}>
        <LandingHero
          onLaunchWorkbench={() => {
            setPageMode('workbench');
            window.location.hash = '#/workbench';
          }}
          onOpenBenchmarks={() => {
            setPageMode('advanced');
            setCurrentView('benchmarks');
            window.location.hash = '#/benchmarks';
          }}
          realTestCount={33}
        />
      </Suspense>
    );
  }

  // Route 2: Paper Workbench (Cream-and-Ink design reference)
  if (pageMode === 'workbench') {
    return (
      <Suspense fallback={<SkeletonLoader />}>
        <PaperWorkbench
          onBackToHero={() => {
            setPageMode('hero');
            window.location.hash = '';
          }}
          onOpenAdvancedLab={(labView) => {
            setPageMode('advanced');
            setCurrentView(labView as any);
            window.location.hash = `#/${labView}`;
          }}
          realTestCount={33}
        />
      </Suspense>
    );
  }

  // Route 3: Advanced Full-Instrument Rack (14 Labs)
  const renderCurrentView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView onOpenMethodCard={handleOpenMethodCard} onNavigate={setCurrentView} />;
      case 'datasets':
        return <DatasetsView onOpenMethodCard={handleOpenMethodCard} />;
      case 'explorer':
        return <ExplorerView />;
      case 'statistics':
        return <StatisticsLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'spectra':
        return <SpectralLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'timefreq':
        return <TimeFreqLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'anomalies':
        return <AnomaliesView onOpenMethodCard={handleOpenMethodCard} />;
      case 'dynamics':
        return <DynamicsView onOpenMethodCard={handleOpenMethodCard} />;
      case 'relations':
        return <RelationsView onOpenMethodCard={handleOpenMethodCard} />;
      case 'inference':
        return <InferenceView onOpenMethodCard={handleOpenMethodCard} />;
      case 'findings':
        return <FindingsView onOpenMethodCard={handleOpenMethodCard} />;
      case 'evidence':
        return <EvidenceGraphView />;
      case 'reproducibility':
        return <ReproducibilityView />;
      case 'benchmarks':
        return <BenchmarksView onNavigate={setCurrentView} />;
      case 'methods':
        return <MethodsLibraryView initialMethod={selectedMethodName} />;
      default:
        return <OverviewView onOpenMethodCard={handleOpenMethodCard} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F6F1] text-[#10141C] font-sans antialiased">
      {/* Hidden Global File Input for CSV Ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Collapsible Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onOpenAccessibility={() => setIsAccessibilityModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        moduleStatuses={moduleStatuses}
      />

      {/* Main Workbench Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8F6F1]">
        {/* Switcher Banner back to Paper Workbench */}
        <div className="h-8 bg-[#F2EFE9] border-b border-[#E6E1D6] px-4 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 text-[#57534E]">
            <span className="w-2 h-2 rounded-full bg-[#2F7D4F]" />
            <span className="font-semibold text-[#10141C]">SYNAPSE Multi-Tool Instrument Rack (14 Dedicated Labs)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setPageMode('workbench');
              window.location.hash = '#/workbench';
            }}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FFFDF9] border border-[#E6E1D6] hover:bg-[#E6E1D6]/60 text-[#10141C] font-semibold transition-colors"
          >
            <span>&larr; Switch to Paper Workbench</span>
          </button>
        </div>

        {/* Top Bar */}
        <TopBar
          onToggleSidebarMobile={() => setIsMobileOpen(true)}
          currentView={currentView}
          datasets={availableDatasets}
          selectedDatasetId={activeSignal.id}
          onSelectDataset={selectDataset}
          onDeleteDataset={deleteDataset}
          isAnalyzing={isAnalyzing}
          onRunAnalysis={runAnalysis}
          onUploadClick={() => fileInputRef.current?.click()}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          apiConnected={apiConnected}
        />

        {/* View Content Port */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F6F1]">
          <Suspense fallback={<SkeletonLoader />}>
            {renderCurrentView()}
          </Suspense>
        </main>
      </div>

      {/* Global Modals */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(view: WorkbenchView) => {
          setCurrentView(view);
          setIsCommandPaletteOpen(false);
        }}
        onRunAnalysis={() => {
          runAnalysis();
          setIsCommandPaletteOpen(false);
        }}
        datasets={availableDatasets}
        onSelectDataset={(id: string) => {
          selectDataset(id);
          setIsCommandPaletteOpen(false);
        }}
        onExportReport={() => {
          setCurrentView('findings');
          setIsCommandPaletteOpen(false);
        }}
      />

      <AccessibilityModal
        isOpen={isAccessibilityModalOpen}
        onClose={() => setIsAccessibilityModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AccessibilityProvider>
      <SignalProvider>
        <AppInner />
      </SignalProvider>
    </AccessibilityProvider>
  );
}
