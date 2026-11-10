import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AccessibilityProvider } from './context/AccessibilityContext';
import { SignalProvider, useSignal } from './context/SignalContext';
import { Sidebar, WorkbenchView } from './components/shell/Sidebar';
import { TopBar } from './components/shell/TopBar';
import { CommandPalette } from './components/shell/CommandPalette';
import { AccessibilityModal } from './components/shell/AccessibilityModal';
import { ShortcutsModal } from './components/shell/ShortcutsModal';

// Views
import { LandingPage } from './views/LandingPage';
import { OverviewView } from './views/OverviewView';
import { DatasetsView } from './views/DatasetsView';
import { ExplorerView } from './views/ExplorerView';
import { StatisticsLabView } from './views/StatisticsLabView';
import { SpectralLabView } from './views/SpectralLabView';
import { TimeFreqLabView } from './views/TimeFreqLabView';
import { AnomaliesView } from './views/AnomaliesView';
import { DynamicsView } from './views/DynamicsView';
import { RelationsView } from './views/RelationsView';
import { InferenceView } from './views/InferenceView';
import { FindingsView } from './views/FindingsView';
import { EvidenceGraphView } from './views/EvidenceGraphView';
import { ReproducibilityView } from './views/ReproducibilityView';
import { BenchmarksView } from './views/BenchmarksView';
import { MethodsLibraryView } from './views/MethodsLibraryView';

const AppInner: React.FC = () => {
  const {
    activeSignal,
    availableDatasets,
    selectDataset,
    loadCustomSignal,
    isAnalyzing,
    runAnalysis,
    currentView,
    setCurrentView,
    moduleStatuses,
    apiConnected,
  } = useSignal();

  // App routing mode: Landing page vs Workbench App shell
  const [isInApp, setIsInApp] = useState<boolean>(() => {
    const hash = window.location.hash.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return hash.includes('overview') ||
           hash.includes('spectra') ||
           hash.includes('benchmarks') ||
           hash.includes('app') ||
           path.startsWith('/app');
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
      setIsInApp(true);
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

        setIsInApp(true);
        setCurrentView('overview');
      }
    };
    reader.readAsText(file);
  };

  const handleExportFullReport = () => {
    setCurrentView('findings');
  };

  // If on landing page route
  if (!isInApp) {
    return (
      <LandingPage
        onEnterApp={() => {
          setIsInApp(true);
          setCurrentView('overview');
        }}
        onOpenBenchmarks={() => {
          setIsInApp(true);
          setCurrentView('benchmarks');
        }}
        onOpenMethodCard={handleOpenMethodCard}
      />
    );
  }

  // Active View Renderer
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
    <div className="flex h-screen w-screen overflow-hidden surface-base text-primary font-sans antialiased">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onToggleSidebarMobile={() => setIsMobileOpen(true)}
          currentView={currentView}
          datasets={availableDatasets}
          selectedDatasetId={activeSignal.id}
          onSelectDataset={selectDataset}
          isAnalyzing={isAnalyzing}
          onRunAnalysis={runAnalysis}
          onUploadClick={() => fileInputRef.current?.click()}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          apiConnected={apiConnected}
        />

        {/* View Content Port */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 surface-subtle/40">
          {renderCurrentView()}
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
          handleExportFullReport();
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
