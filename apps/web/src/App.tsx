import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { SignalProvider, useSignal } from './context/SignalContext';
import { Sidebar, WorkbenchView } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { CommandPalette } from './components/shell/CommandPalette';
import { AccessibilityModal } from './components/shell/AccessibilityModal';
import { ShortcutsModal } from './components/shell/ShortcutsModal';
import { Compass, Loader2, Sliders, ArrowLeft } from 'lucide-react';
import ErrorBoundary from './components/common/ErrorBoundary';
import { parseUniversalSignalCSV } from './utils/csvParser';
import { parseCsvWithStreamingWorker } from './utils/streamingCsvParser';

// Lazy-Loaded Views for Fast Initial Bundle
const LandingHero = React.lazy(() =>
  import('./views/LandingHero').then((m) => ({ default: m.default || m.LandingHero }))
);
const PaperWorkbench = React.lazy(() =>
  import('./views/PaperWorkbench').then((m) => ({ default: m.default || m.PaperWorkbench }))
);

// Advanced Lab Views (Code-split for under 150 kB initial load)
const OverviewView = React.lazy(() =>
  import('./views/OverviewView').then((m) => ({ default: m.default || m.OverviewView }))
);
const DatasetsView = React.lazy(() =>
  import('./views/DatasetsView').then((m) => ({ default: m.default || m.DatasetsView }))
);
const ExplorerView = React.lazy(() =>
  import('./views/ExplorerView').then((m) => ({ default: m.default || m.ExplorerView }))
);
const StatisticsLabView = React.lazy(() =>
  import('./views/StatisticsLabView').then((m) => ({ default: m.default || m.StatisticsLabView }))
);
const SpectralLabView = React.lazy(() =>
  import('./views/SpectralLabView').then((m) => ({ default: m.default || m.SpectralLabView }))
);
const TimeFreqLabView = React.lazy(() =>
  import('./views/TimeFreqLabView').then((m) => ({ default: m.default || m.TimeFreqLabView }))
);
const AnomaliesView = React.lazy(() =>
  import('./views/AnomaliesView').then((m) => ({ default: m.default || m.AnomaliesView }))
);
const DynamicsView = React.lazy(() =>
  import('./views/DynamicsView').then((m) => ({ default: m.default || m.DynamicsView }))
);
const RelationsView = React.lazy(() =>
  import('./views/RelationsView').then((m) => ({ default: m.default || m.RelationsView }))
);
const AstronomyLabView = React.lazy(() =>
  import('./views/AstronomyLabView').then((m) => ({ default: m.default || m.AstronomyLabView }))
);
const PhysicsLabView = React.lazy(() =>
  import('./views/PhysicsLabView').then((m) => ({ default: m.default || m.PhysicsLabView }))
);
const BioSignalsLabView = React.lazy(() =>
  import('./views/BioSignalsLabView').then((m) => ({ default: m.default || m.BioSignalsLabView }))
);
const ChaosLabView = React.lazy(() =>
  import('./views/ChaosLabView').then((m) => ({ default: m.default || m.ChaosLabView }))
);
const EarthSystemsLabView = React.lazy(() =>
  import('./views/EarthSystemsLabView').then((m) => ({ default: m.default || m.EarthSystemsLabView }))
);
const QuantumLabView = React.lazy(() =>
  import('./views/QuantumLabView').then((m) => ({ default: m.default || m.QuantumLabView }))
);
const FeynmanLabView = React.lazy(() =>
  import('./views/FeynmanLabView').then((m) => ({ default: m.default || m.FeynmanLabView }))
);
const SatelliteLabView = React.lazy(() =>
  import('./views/SatelliteLabView').then((m) => ({ default: m.default || m.SatelliteLabView }))
);
const GeophysicsLabView = React.lazy(() =>
  import('./views/GeophysicsLabView').then((m) => ({ default: m.default || m.GeophysicsLabView }))
);
const InferenceView = React.lazy(() =>
  import('./views/InferenceView').then((m) => ({ default: m.default || m.InferenceView }))
);
const FindingsView = React.lazy(() =>
  import('./views/FindingsView').then((m) => ({ default: m.default || m.FindingsView }))
);
const EvidenceGraphView = React.lazy(() =>
  import('./views/EvidenceGraphView').then((m) => ({ default: m.default || m.EvidenceGraphView }))
);
const ReproducibilityView = React.lazy(() =>
  import('./views/ReproducibilityView').then((m) => ({ default: m.default || m.ReproducibilityView }))
);
const BenchmarksView = React.lazy(() =>
  import('./views/BenchmarksView').then((m) => ({ default: m.default || m.BenchmarksView }))
);
const MethodsLibraryView = React.lazy(() =>
  import('./views/MethodsLibraryView').then((m) => ({ default: m.default || m.MethodsLibraryView }))
);
const InstrumentRackView = React.lazy(() =>
  import('./views/InstrumentRackView').then((m) => ({ default: m.default || m.InstrumentRackView }))
);
const PaperGraphView = React.lazy(() =>
  import('./views/PaperGraphView').then((m) => ({ default: m.default || m.PaperGraphView }))
);
const PaperGraphRackWorkspaceView = React.lazy(() =>
  import('./views/PaperGraphRackWorkspaceView').then((m) => ({ default: m.default || m.PaperGraphRackWorkspaceView }))
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
    restoreDefaultDatasets,
    isAnalyzing,
    runAnalysis,
    currentView,
    setCurrentView,
    moduleStatuses,
    apiConnected,
  } = useSignal();

  // Page Routing: 'hero' (at "/") | 'workbench' (cream paper style) | 'advanced' (15-lab suite)
  const [pageMode, setPageMode] = useState<'hero' | 'workbench' | 'advanced'>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    if (hash.includes('workbench') || path.includes('workbench')) return 'workbench';
    if (
      hash.includes('app') ||
      hash.includes('overview') ||
      hash.includes('rack') ||
      hash.includes('datasets') ||
      hash.includes('explorer') ||
      hash.includes('statistics') ||
      hash.includes('spectra') ||
      hash.includes('timefreq') ||
      hash.includes('anomalies') ||
      hash.includes('dynamics') ||
      hash.includes('relations') ||
      hash.includes('astronomy') ||
      hash.includes('physics') ||
      hash.includes('biosignals') ||
      hash.includes('chaos') ||
      hash.includes('earth_systems') ||
      hash.includes('quantum') ||
      hash.includes('feynman') ||
      hash.includes('satellite') ||
      hash.includes('geophysics') ||
      hash.includes('inference') ||
      hash.includes('findings') ||
      hash.includes('evidence') ||
      hash.includes('reproducibility') ||
      hash.includes('benchmarks') ||
      hash.includes('methods') ||
      hash.includes('papergraph')
    ) {
      return 'advanced';
    }
    return 'hero';
  });

  // Keep pageMode in sync with URL hash
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('workbench')) {
        setPageMode('workbench');
      } else if (
        hash.includes('app') ||
        hash.includes('overview') ||
        hash.includes('rack') ||
        hash.includes('datasets') ||
        hash.includes('explorer') ||
        hash.includes('statistics') ||
        hash.includes('spectra') ||
        hash.includes('timefreq') ||
        hash.includes('anomalies') ||
        hash.includes('dynamics') ||
        hash.includes('relations') ||
        hash.includes('astronomy') ||
        hash.includes('physics') ||
        hash.includes('biosignals') ||
        hash.includes('chaos') ||
        hash.includes('earth_systems') ||
        hash.includes('quantum') ||
        hash.includes('feynman') ||
        hash.includes('satellite') ||
        hash.includes('geophysics') ||
        hash.includes('inference') ||
        hash.includes('findings') ||
        hash.includes('evidence') ||
        hash.includes('reproducibility') ||
        hash.includes('benchmarks') ||
        hash.includes('methods') ||
        hash.includes('papergraph')
      ) {
        setPageMode('advanced');
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

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

  // Real CSV Upload Handler with Papa Parse Web Worker Streaming
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; rows: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress({ percent: 5, rows: 0 });

    const handle = parseCsvWithStreamingWorker(file, file.name, {
      onProgress: (prog) => {
        setUploadProgress({ percent: prog.percent, rows: prog.rowsParsed });
      },
    });

    handle.promise
      .then((parsed) => {
        loadCustomSignal(parsed);
        setUploadProgress(null);
        if (pageMode === 'hero') {
          setPageMode('advanced');
          setCurrentView('overview');
          window.location.hash = '#/overview';
        }
      })
      .catch((err) => {
        console.warn('Papa Parse worker failed, attempting fallback parser:', err);
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
            const fallback = parseUniversalSignalCSV(text, file.name);
            if (fallback) {
              loadCustomSignal(fallback);
              if (pageMode === 'hero') {
                setPageMode('advanced');
                setCurrentView('overview');
                window.location.hash = '#/overview';
              }
            }
          }
          setUploadProgress(null);
        };
        reader.onerror = () => setUploadProgress(null);
        reader.readAsText(file);
      });

    // Reset file input so re-uploading the same file triggers change
    e.target.value = '';
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
          onOpenRack={() => {
            setPageMode('advanced');
            setCurrentView('rack');
            window.location.hash = '#/rack';
          }}
          onOpenBenchmarks={() => {
            setPageMode('advanced');
            setCurrentView('benchmarks');
            window.location.hash = '#/benchmarks';
          }}
          onOpenMethods={() => {
            setPageMode('advanced');
            setCurrentView('methods');
            window.location.hash = '#/methods';
          }}
          realTestCount={78}
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
          realTestCount={78}
        />
      </Suspense>
    );
  }

  // Route 3: Advanced Full-Instrument Rack (14 Labs)
  const renderCurrentView = () => {
    switch (currentView) {
      case 'workbench':
        return (
          <PaperWorkbench
            onBackToHero={() => {
              setPageMode('hero');
              window.location.hash = '';
            }}
            onOpenAdvancedLab={(labView) => {
              setCurrentView(labView as any);
              window.location.hash = `#/${labView}`;
            }}
            realTestCount={78}
          />
        );
      case 'papergraph':
        return (
          <PaperGraphView
            onOpenRackWorkspace={() => {
              setCurrentView('papergraph_rack' as any);
              window.location.hash = '#/papergraph-rack';
            }}
            onOpenPaperWorkbench={() => {
              setPageMode('workbench');
              window.location.hash = '#/workbench';
            }}
          />
        );
      case 'papergraph_rack':
        return (
          <PaperGraphRackWorkspaceView
            onBackToLiterature={() => {
              setCurrentView('papergraph');
              window.location.hash = '#/papergraph';
            }}
          />
        );
      case 'overview':
        return <OverviewView onOpenMethodCard={handleOpenMethodCard} onNavigate={setCurrentView} />;
      case 'rack':
        return <InstrumentRackView />;
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
      case 'astronomy':
        return <AstronomyLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'physics':
        return <PhysicsLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'biosignals':
        return <BioSignalsLabView />;
      case 'chaos':
        return <ChaosLabView />;
      case 'earth_systems':
        return <EarthSystemsLabView />;
      case 'quantum':
        return <QuantumLabView />;
      case 'feynman':
        return <FeynmanLabView />;
      case 'satellite':
        return <SatelliteLabView onOpenMethodCard={handleOpenMethodCard} />;
      case 'geophysics':
        return <GeophysicsLabView onOpenMethodCard={handleOpenMethodCard} />;
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
      {/* Floating Streaming CSV Upload Progress */}
      {uploadProgress && (
        <div className="fixed top-3 right-4 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#FFFDF9] border border-[#0F766E] rounded-xl shadow-lg font-mono text-xs">
          <Loader2 className="w-4 h-4 text-[#0F766E] animate-spin" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1F2430]">Streaming CSV Ingestion</span>
              <span className="text-[#0F766E] font-bold">{uploadProgress.percent}%</span>
            </div>
            <div className="text-[10px] text-[#78716C]">
              Papa Parse Web Worker &bull; {uploadProgress.rows.toLocaleString()} rows parsed
            </div>
          </div>
        </div>
      )}

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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F6F3EC]">
        {/* Switcher Banner back to Paper Workbench */}
        <div className="h-12 bg-[#F1ECE1] border-b border-[#DDD6C7] px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-mono shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 text-[#4A5060]">
            <div className="w-6 h-6 rounded-md bg-[#0F766E] flex items-center justify-center text-white shadow-2xs shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-[#1F2430] text-sm tracking-tight">SYNAPSE Multi-Tool Instrument Rack</span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#E6F4F2] text-[#0F766E] text-[10px] font-bold border border-[#0F766E]/20">
                28 Scientific Instruments Loaded
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-[#78716C] font-mono">
            <span>Synchronized Temporal Cursors</span>
            <span>&bull;</span>
            <span>Bitwise Analytical Engine</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setPageMode('workbench');
              window.location.hash = '#/workbench';
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#DDD6C7] hover:border-[#0F766E]/50 hover:bg-[#FAF8F5] text-[#1F2430] font-semibold text-xs transition-all shadow-2xs group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#0F766E] transition-transform group-hover:-translate-x-0.5" />
            <span>Switch to Paper Workbench</span>
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
          onRestoreDatasets={restoreDefaultDatasets}
          isAnalyzing={isAnalyzing}
          onRunAnalysis={runAnalysis}
          onUploadClick={() => fileInputRef.current?.click()}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          apiConnected={apiConnected}
        />

        {/* View Content Port */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F6F3EC]">
          <ErrorBoundary>
            <Suspense fallback={<SkeletonLoader />}>
              {renderCurrentView()}
            </Suspense>
          </ErrorBoundary>
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
