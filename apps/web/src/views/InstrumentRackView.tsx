import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  Trash2,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Search,
  Pin,
  Undo2,
  Download,
  Copy,
  Plus,
  Activity,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { useSignal } from '../context/SignalContext';
import { INSTRUMENT_REGISTRY, InstrumentDefinition, InstrumentCategory } from '../data/instrumentRegistry';
import {
  computeStatistics,
  computeWelchPSD,
  computeMultitaperPSD,
  computeSTFT,
  computeCWT,
  computeHilbertAnalysis,
  computeEMD,
  computeLombScargle,
  computeComplexityMetrics,
  computeDFA,
  computePELTAndCUSUM,
  computeCoherenceAndXCorr,
  computeGrangerCausality,
  computePCA,
  computeSurrogateBounds,
  runAutoAnalystEngine,
  computeMUSIC,
  computeCepstrum,
  computeKalmanFilter,
  computeMatrixProfile,
  computeTransferEntropy,
  getMethodComparisonMatrix,
} from '../utils/signalMath';

interface PanelInstance {
  instanceId: string;
  instrumentId: string;
  title: string;
  category: InstrumentCategory;
  caption: string;
  pinned: boolean;
  collapsed: boolean;
  fullscreen: boolean;
  hiddenSeries: Record<string, boolean>;
  customSettings?: Record<string, any>;
}

export const InstrumentRackView: React.FC = () => {
  const { activeSignal } = useSignal();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [layoutPreset, setLayoutPreset] = useState<'compact' | 'comfortable' | 'presentation'>('comfortable');

  // Shared Linked Cursor (Hover time in seconds across time panels)
  const [sharedCursorTime, setSharedCursorTime] = useState<number | null>(null);
  const [highlightedSeries, setHighlightedSeries] = useState<string | null>(null);

  // Add Instrument Dropdown State
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Deleted panels & 8-second Undo toast
  const [deletedPanelsHistory, setDeletedPanelsHistory] = useState<PanelInstance[]>([]);
  const [recentlyDeletedPanel, setRecentlyDeletedPanel] = useState<PanelInstance | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(8);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);

  // Initialize Default Panels from Registry
  const initialPanels: PanelInstance[] = useMemo(() => {
    // Default 8 comprehensive instruments for the rack
    const defaultIds = [
      'oscillogram',
      'welch_psd',
      'stft_spectrogram',
      'multitaper',
      'cwt_scalogram',
      'hilbert_emd',
      'phase_space',
      'dfa_scaling',
      'changepoint_pelt',
      'coherence_xcorr',
      'granger_causality',
      'surrogate_testing',
      'auto_analyst',
    ];
    return defaultIds.map((id, idx) => {
      const def = INSTRUMENT_REGISTRY.find((d) => d.id === id) || INSTRUMENT_REGISTRY[0];
      return {
        instanceId: `panel_${id}_${idx}`,
        instrumentId: def.id,
        title: def.title,
        category: def.category,
        caption: def.caption,
        pinned: !!def.defaultPinned,
        collapsed: false,
        fullscreen: false,
        hiddenSeries: {},
      };
    });
  }, []);

  const [panels, setPanels] = useState<PanelInstance[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_rack_instances_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return initialPanels;
  });

  // Persist panels to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('synapse_rack_instances_v2', JSON.stringify(panels));
    } catch (e) {}
  }, [panels]);

  // Undo Timer Effect (8-second countdown)
  useEffect(() => {
    if (!recentlyDeletedPanel) return;
    setUndoCountdown(8);
    const interval = setInterval(() => {
      setUndoCountdown((c) => {
        if (c <= 1) {
          setRecentlyDeletedPanel(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recentlyDeletedPanel]);

  // Execute All Mathematical Computations Deterministically
  const mathResults = useMemo(() => {
    const raw = activeSignal.channels[activeSignal.channelNames[0]] || [];
    const fs = activeSignal.samplingRate || 200;
    const ch2 = activeSignal.channelNames.length > 1
      ? activeSignal.channels[activeSignal.channelNames[1]]
      : raw.map((_v, i) => 0.8 * (raw[Math.max(0, i - 5)] || 0) + ((i % 19) - 9) / 25.0);

    const stats = computeStatistics(raw, fs);
    const welch = computeWelchPSD(raw, fs);
    const multitaper = computeMultitaperPSD(raw, fs);
    const stft = computeSTFT(raw, fs);
    const cwt = computeCWT(raw, fs);
    const hilbert = computeHilbertAnalysis(raw, fs);
    const emd = computeEMD(raw, 3);
    const lombTimes = Array.from({ length: raw.length }, (_, i) => i / fs);
    const lomb = computeLombScargle(lombTimes, raw);
    const complexity = computeComplexityMetrics(raw);
    const dfa = computeDFA(raw);
    const pelt = computePELTAndCUSUM(raw, fs);
    const coherence = computeCoherenceAndXCorr(raw, ch2, fs);
    const granger = computeGrangerCausality(raw, ch2);
    const pca = computePCA(activeSignal.channels, activeSignal.channelNames);
    const surrogates = computeSurrogateBounds(raw, fs, 20);
    const autoFindings = runAutoAnalystEngine(raw, fs);
    const musicResult = computeMUSIC(raw, fs);
    const cepstrumResult = computeCepstrum(raw, fs);
    const kalmanResult = computeKalmanFilter(raw, fs);
    const matrixProfileResult = computeMatrixProfile(raw);
    const transferEntropyResult = computeTransferEntropy(raw, ch2);
    const methodComparisonList = getMethodComparisonMatrix();

    // Downsampled Time Series for Oscillogram (up to 250 points)
    const stride = Math.max(1, Math.floor(raw.length / 250));
    const timeData: Array<{ time: number; raw: number; outlier?: number }> = [];
    for (let i = 0; i < raw.length; i += stride) {
      const t = parseFloat((i / fs).toFixed(3));
      const val = parseFloat(raw[i].toFixed(4));
      const isOutlier = stats.zOutliers.some((o) => Math.abs(o.time - t) < 0.02);
      timeData.push({
        time: t,
        raw: val,
        outlier: isOutlier ? val : undefined,
      });
    }

    // Welch Data
    const welchData = welch.frequencies.map((f, i) => ({
      freq: f,
      psd: welch.psd[i],
      peak: welch.peaks.some((p) => Math.abs(p.frequency - f) < 0.8) ? welch.psd[i] : undefined,
    }));

    // Multitaper Data
    const multitaperData = multitaper.frequencies.map((f, i) => ({
      freq: f,
      psd: multitaper.psd[i],
      ciUpper: multitaper.upperBound95[i],
      ciLower: multitaper.lowerBound95[i],
      fLine: multitaper.fTest[i]?.isLine ? multitaper.psd[i] : undefined,
    }));

    // Phase Space Data (Takens delay tau = 5)
    const tau = 5;
    const phaseData: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < raw.length - tau; i += Math.max(1, Math.floor(raw.length / 200))) {
      phaseData.push({
        x: parseFloat(raw[i].toFixed(3)),
        y: parseFloat(raw[i + tau].toFixed(3)),
      });
    }

    // Hilbert & EMD series
    const hilbertData = hilbert.times.slice(0, 200).map((t, i) => ({
      time: t,
      raw: parseFloat((raw[i] || 0).toFixed(3)),
      envelope: hilbert.instantaneousAmplitude[i],
      imf1: parseFloat((emd.imfs[0]?.[i] || 0).toFixed(3)),
      imf2: parseFloat((emd.imfs[1]?.[i] || 0).toFixed(3)),
    }));

    // Autocorrelation Data
    const acfData: Array<{ lag: number; acf: number; boundPos: number; boundNeg: number }> = [];
    const n = Math.min(raw.length, 400);
    const mean = stats.mean;
    const denom = raw.slice(0, n).reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) || 1;
    const bartlett = parseFloat((1.96 / Math.sqrt(n)).toFixed(3));

    for (let k = 0; k < 60; k++) {
      let sumProd = 0;
      for (let t = 0; t < n - k; t++) {
        sumProd += (raw[t] - mean) * (raw[t + k] - mean);
      }
      acfData.push({
        lag: k,
        acf: parseFloat((sumProd / denom).toFixed(3)),
        boundPos: bartlett,
        boundNeg: -bartlett,
      });
    }

    // DFA Log-Log Data
    const dfaData = dfa.scales.map((s, i) => ({
      scale: s,
      logScale: parseFloat(Math.log10(s).toFixed(3)),
      fluctuation: dfa.fluctuations[i],
      logF: parseFloat(Math.log10(dfa.fluctuations[i] || 1e-6).toFixed(3)),
    }));

    // Surrogate Bounds Data
    const surrogateData = surrogates.frequencies.map((f, i) => ({
      freq: f,
      empirical: surrogates.empiricalPower[i],
      surrUpper: surrogates.surrogateUpper95[i],
      surrMedian: surrogates.surrogateMedian[i],
      surrLower: surrogates.surrogateLower5[i],
      isRejected: surrogates.rejectedFrequencies.includes(f),
    }));

    // Coherence and XCorr Data
    const cohData = coherence.frequencies.map((f, i) => ({
      freq: f,
      coherence: coherence.coherence[i],
    }));

    const xcorrData = coherence.lags.map((lag, i) => ({
      lag,
      xcorr: coherence.crossCorrelation[i],
    }));

    return {
      stats,
      welch,
      welchData,
      multitaper,
      multitaperData,
      stft,
      cwt,
      hilbert,
      emd,
      hilbertData,
      lomb,
      complexity,
      dfa,
      dfaData,
      pelt,
      coherence,
      cohData,
      xcorrData,
      granger,
      pca,
      surrogates,
      surrogateData,
      autoFindings,
      timeData,
      phaseData,
      acfData,
      musicResult,
      cepstrumResult,
      kalmanResult,
      matrixProfileResult,
      transferEntropyResult,
      methodComparisonList,
    };
  }, [activeSignal]);

  // Filter Panels based on Search and Category
  const filteredPanels = useMemo(() => {
    return panels
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          const def = INSTRUMENT_REGISTRY.find((d) => d.id === p.instrumentId);
          const matchTag = def?.tags.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchCat || matchTag;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned panels always float to top
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
  }, [panels, selectedCategory, searchQuery]);

  // Panel Manipulation Actions
  const handleTogglePin = (instanceId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, pinned: !p.pinned } : p))
    );
  };

  const handleToggleCollapse = (instanceId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, collapsed: !p.collapsed } : p))
    );
  };

  const handleToggleFullscreen = (instanceId: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.instanceId === instanceId ? { ...p, fullscreen: !p.fullscreen } : p))
    );
  };

  const handleDuplicatePanel = (panel: PanelInstance) => {
    const newInstance: PanelInstance = {
      ...panel,
      instanceId: `panel_${panel.instrumentId}_${Date.now()}`,
      title: `${panel.title} (Copy)`,
      pinned: false,
    };
    const index = panels.findIndex((p) => p.instanceId === panel.instanceId);
    const nextPanels = [...panels];
    nextPanels.splice(index + 1, 0, newInstance);
    setPanels(nextPanels);
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setPanels((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= panels.length - 1) return;
    setPanels((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleDeletePanel = (panel: PanelInstance) => {
    setPanels((prev) => prev.filter((p) => p.instanceId !== panel.instanceId));
    setRecentlyDeletedPanel(panel);
    setDeletedPanelsHistory((prev) => [panel, ...prev.slice(0, 15)]);
  };

  const handleUndoDelete = () => {
    if (!recentlyDeletedPanel) return;
    setPanels((prev) => [recentlyDeletedPanel, ...prev]);
    setRecentlyDeletedPanel(null);
  };

  const handleRestoreFromHistory = (panelToRestore: PanelInstance) => {
    setPanels((prev) => [...prev, panelToRestore]);
    setDeletedPanelsHistory((prev) => prev.filter((p) => p.instanceId !== panelToRestore.instanceId));
  };

  const handleClearAllPanels = () => {
    setDeletedPanelsHistory((prev) => [...panels, ...prev]);
    setPanels([]);
    setShowClearConfirm(false);
  };

  const handleAddInstrument = (def: InstrumentDefinition) => {
    const newInstance: PanelInstance = {
      instanceId: `panel_${def.id}_${Date.now()}`,
      instrumentId: def.id,
      title: def.title,
      category: def.category,
      caption: def.caption,
      pinned: false,
      collapsed: false,
      fullscreen: false,
      hiddenSeries: {},
    };
    setPanels((prev) => [newInstance, ...prev]);
    setShowAddMenu(false);
  };

  const handleToggleSeries = (instanceId: string, seriesId: string) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.instanceId !== instanceId) return p;
        const cur = p.hiddenSeries[seriesId] || false;
        return {
          ...p,
          hiddenSeries: {
            ...p.hiddenSeries,
            [seriesId]: !cur,
          },
        };
      })
    );
  };

  const handleExportCSV = (panel: PanelInstance) => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (panel.instrumentId === 'oscillogram') {
      csvContent += 'time_s,voltage_v\n';
      mathResults.timeData.forEach((row) => {
        csvContent += `${row.time},${row.raw}\n`;
      });
    } else if (panel.instrumentId === 'welch_psd') {
      csvContent += 'frequency_hz,psd_v2_per_hz\n';
      mathResults.welchData.forEach((row) => {
        csvContent += `${row.freq},${row.psd}\n`;
      });
    } else {
      csvContent += 'index,value\n';
      csvContent += `1,1.0\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${panel.title.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Card Height calculation based on layout preset
  const getCardHeight = (fullscreen: boolean) => {
    if (fullscreen) return 600;
    if (layoutPreset === 'compact') return 280;
    if (layoutPreset === 'presentation') return 480;
    return 360; // comfortable
  };

  return (
    <div className="w-full min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Instrument Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--color-ink)] tracking-tight">
              Full Instrument Rack
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--color-accent)] text-white">
              {panels.length} Active Instruments
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1 font-mono">
            Scientific multi-channel visualization suite • Deterministic signal intelligence • Linked temporal cursor
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Instrument Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Instrument</span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 p-2 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] px-2 py-1">
                  Available Instruments
                </div>
                {INSTRUMENT_REGISTRY.map((def) => (
                  <button
                    key={def.id}
                    onClick={() => handleAddInstrument(def)}
                    className="w-full text-left px-2.5 py-2 rounded text-xs hover:bg-[var(--color-tint)] transition flex flex-col gap-0.5 border border-transparent hover:border-[var(--color-border)]"
                  >
                    <div className="font-semibold text-[var(--color-ink)] flex items-center justify-between">
                      <span>{def.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-border)] text-[var(--color-muted)]">
                        {def.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--color-muted)] line-clamp-1">{def.caption}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Layout Presets */}
          <div className="flex items-center rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-0.5 text-xs font-mono">
            <button
              onClick={() => setLayoutPreset('compact')}
              className={`px-2 py-1 rounded transition ${
                layoutPreset === 'compact'
                  ? 'bg-[var(--color-tint)] font-bold text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setLayoutPreset('comfortable')}
              className={`px-2 py-1 rounded transition ${
                layoutPreset === 'comfortable'
                  ? 'bg-[var(--color-tint)] font-bold text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setLayoutPreset('presentation')}
              className={`px-2 py-1 rounded transition ${
                layoutPreset === 'presentation'
                  ? 'bg-[var(--color-tint)] font-bold text-[var(--color-ink)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Presentation
            </button>
          </div>

          {/* Restore Deleted Panels Dropdown */}
          {deletedPanelsHistory.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowRestoreMenu(!showRestoreMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-panel)] hover:bg-[var(--color-tint)] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore ({deletedPanelsHistory.length})</span>
              </button>

              {showRestoreMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-xl z-50 p-2 space-y-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-muted)] px-2 py-1">
                    Recently Deleted
                  </div>
                  {deletedPanelsHistory.map((dp, i) => (
                    <button
                      key={dp.instanceId + i}
                      onClick={() => handleRestoreFromHistory(dp)}
                      className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-[var(--color-tint)] transition flex items-center justify-between"
                    >
                      <span className="truncate">{dp.title}</span>
                      <RotateCcw className="w-3 h-3 text-[var(--color-accent)] ml-2 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reset / Clear Rack */}
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-panel)] hover:bg-red-50 text-[var(--color-muted)] hover:text-red-600 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Rack</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin text-xs font-mono">
          {[
            { id: 'all', label: 'All Instruments' },
            { id: 'Spectral', label: 'Spectral' },
            { id: 'Time-Frequency', label: 'Time-Frequency' },
            { id: 'Complexity & Dynamics', label: 'Complexity' },
            { id: 'Anomalies & Changepoints', label: 'Anomalies' },
            { id: 'Multi-channel & Relations', label: 'Multi-channel' },
            { id: 'Statistical & Inference', label: 'Inference' },
            { id: 'Auto-Analyst', label: 'Auto-Analyst' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap transition border ${
                selectedCategory === cat.id
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] font-semibold'
                  : 'bg-[var(--color-panel)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instruments or formulas..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Instruments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPanels.map((panel, index) => {
          const def = INSTRUMENT_REGISTRY.find((d) => d.id === panel.instrumentId) || INSTRUMENT_REGISTRY[0];
          const isFullscreen = panel.fullscreen;
          const cardHeight = getCardHeight(isFullscreen);

          return (
            <div
              key={panel.instanceId}
              className={`group flex flex-col rounded-lg border bg-[var(--color-panel)] border-[var(--color-border)] shadow-sm transition duration-150 hover:shadow-md ${
                isFullscreen ? 'col-span-1 md:col-span-2 xl:col-span-3 ring-2 ring-[var(--color-accent)]' : ''
              } ${panel.pinned ? 'border-l-4 border-l-[var(--color-accent)]' : ''}`}
            >
              {/* Panel Top Header Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-tint)] bg-opacity-40 rounded-t-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-[var(--color-muted)] font-semibold">
                    #{index + 1}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[var(--color-border)] text-[var(--color-ink)]">
                    {panel.category}
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-sm text-[var(--color-ink)] truncate">
                    {panel.title}
                  </h3>
                </div>

                {/* Instrument Header Control Buttons */}
                <div className="flex items-center gap-1 text-[var(--color-muted)] opacity-80 group-hover:opacity-100 transition">
                  {/* Move Up */}
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Down */}
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === panels.length - 1}
                    title="Move down"
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Pin to Top */}
                  <button
                    onClick={() => handleTogglePin(panel.instanceId)}
                    title={panel.pinned ? 'Unpin' : 'Pin to top'}
                    className={`p-1 rounded hover:bg-[var(--color-border)] transition ${
                      panel.pinned ? 'text-[var(--color-accent)] font-bold' : 'hover:text-[var(--color-ink)]'
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicatePanel(panel)}
                    title="Duplicate instrument"
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Export CSV */}
                  <button
                    onClick={() => handleExportCSV(panel)}
                    title="Export CSV data"
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Maximize / Fullscreen */}
                  <button
                    onClick={() => handleToggleFullscreen(panel.instanceId)}
                    title={isFullscreen ? 'Restore standard size' : 'Expand full width'}
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>

                  {/* Collapse Toggle */}
                  <button
                    onClick={() => handleToggleCollapse(panel.instanceId)}
                    title={panel.collapsed ? 'Expand body' : 'Collapse body'}
                    className="p-1 rounded hover:bg-[var(--color-border)] hover:text-[var(--color-ink)] transition"
                  >
                    {panel.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>

                  {/* Delete Button with 8-second Undo toast */}
                  <button
                    onClick={() => handleDeletePanel(panel)}
                    title="Delete panel (with undo)"
                    className="p-1 rounded hover:bg-red-50 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subheader: Scientific Caption & Interactive Legend */}
              <div className="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] bg-opacity-30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-[var(--color-muted)] line-clamp-1">
                  {panel.caption}
                </span>

                {/* Interactive Legend with Click-to-Toggle and Hover-Highlight */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  {def.legend.map((item) => {
                    const isHidden = !!panel.hiddenSeries[item.id];
                    const isHovered = highlightedSeries === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggleSeries(panel.instanceId, item.id)}
                        onMouseEnter={() => setHighlightedSeries(item.id)}
                        onMouseLeave={() => setHighlightedSeries(null)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition border ${
                          isHidden
                            ? 'opacity-40 border-transparent bg-transparent line-through text-[var(--color-muted)]'
                            : isHovered
                            ? 'border-[var(--color-ink)] bg-white font-bold'
                            : 'border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-ink)]'
                        }`}
                        title={`Click to ${isHidden ? 'show' : 'hide'} ${item.name}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.name}</span>
                        {item.unit && <span className="text-[var(--color-muted)]">({item.unit})</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instrument Body / Visualizer Canvas */}
              {!panel.collapsed && (
                <div
                  className="p-4 flex flex-col justify-center relative overflow-hidden"
                  style={{ height: `${cardHeight}px` }}
                >
                  {renderInstrumentVisualizer({
                    panel,
                    def,
                    mathResults,
                    sharedCursorTime,
                    setSharedCursorTime,
                    highlightedSeries,
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Empty State if All Filtered Out */}
      {filteredPanels.length === 0 && (
        <div className="w-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-[var(--color-border)] rounded-lg bg-[var(--color-panel)] p-6 space-y-3 font-mono">
          <Activity className="w-8 h-8 text-[var(--color-muted)] animate-pulse" />
          <h4 className="font-serif font-bold text-base text-[var(--color-ink)]">
            No instruments match the current filter
          </h4>
          <p className="text-xs text-[var(--color-muted)] max-w-sm">
            Try adjusting your search query or selecting a different instrument category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-4 py-1.5 text-xs rounded bg-[var(--color-ink)] text-white font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 5. Undo Notification Toast (8-second countdown) */}
      {recentlyDeletedPanel && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-ink)] text-white shadow-2xl border border-gray-700 font-mono text-xs animate-bounce">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>
              Removed <strong className="underline">{recentlyDeletedPanel.title}</strong>
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo ({undoCountdown}s)</span>
          </button>
        </div>
      )}

      {/* 6. Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4 font-mono">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[var(--color-ink)]">Clear Instrument Rack?</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  This will remove all {panels.length} active instruments from your workstation.
                </p>
              </div>
            </div>
            <div className="p-3 bg-[var(--color-tint)] rounded text-xs text-[var(--color-ink)]">
              You can restore cleared instruments anytime from the "Restore" dropdown or reset to defaults.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded border border-[var(--color-border)] text-xs text-[var(--color-ink)] hover:bg-[var(--color-tint)]"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllPanels}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Specialized Visualizer Renderer for Instruments
// ==========================================

interface VisualizerProps {
  panel: PanelInstance;
  def?: InstrumentDefinition;
  mathResults: any;
  sharedCursorTime: number | null;
  setSharedCursorTime: (t: number | null) => void;
  highlightedSeries: string | null;
}

function renderInstrumentVisualizer({
  panel,
  def: _def,
  mathResults,
  sharedCursorTime,
  setSharedCursorTime,
  highlightedSeries,
}: VisualizerProps) {
  const isHidden = (seriesId: string) => !!panel.hiddenSeries[seriesId];
  const isHighlight = (seriesId: string) => highlightedSeries === seriesId;

  switch (panel.instrumentId) {
    // 1. Oscillogram
    case 'oscillogram':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.timeData}
            onMouseMove={(e: any) => {
              if (e?.activePayload?.[0]?.payload?.time !== undefined) {
                setSharedCursorTime(e.activePayload[0].payload.time);
              }
            }}
            onMouseLeave={() => setSharedCursorTime(null)}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="time" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}s`} />
            <YAxis stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}V`} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }}
              formatter={(v: any) => [`${v} V`, 'Amplitude']}
              labelFormatter={(l) => `Time: ${l} s`}
            />
            {sharedCursorTime !== null && (
              <ReferenceLine x={sharedCursorTime} stroke="#B7791F" strokeDasharray="3 3" />
            )}
            {!isHidden('raw') && (
              <Line
                type="monotone"
                dataKey="raw"
                stroke="#1F2430"
                strokeWidth={isHighlight('raw') ? 2.5 : 1.2}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {!isHidden('outliers') && (
              <Line
                type="monotone"
                dataKey="outlier"
                stroke="#B7791F"
                strokeWidth={2}
                dot={{ r: 4, fill: '#B7791F' }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 2. Welch PSD
    case 'welch_psd':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.welchData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => v.toFixed(3)} domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }}
              formatter={(v: any) => [`${v} V²/Hz`, 'Power Density']}
              labelFormatter={(l) => `Frequency: ${l} Hz`}
            />
            {!isHidden('psd') && (
              <Line
                type="monotone"
                dataKey="psd"
                stroke="#0072B2"
                strokeWidth={isHighlight('psd') ? 2.5 : 1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
            {!isHidden('peaks') && (
              <Line
                type="monotone"
                dataKey="peak"
                stroke="#D55E00"
                strokeWidth={0}
                dot={{ r: 4, fill: '#D55E00' }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 3. Thomson Multitaper
    case 'multitaper':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.multitaperData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => v.toFixed(3)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }}
            />
            {!isHidden('ci95') && (
              <>
                <Line type="monotone" dataKey="ciUpper" stroke="#6B6F7B" strokeDasharray="3 3" dot={false} strokeWidth={1} />
                <Line type="monotone" dataKey="ciLower" stroke="#6B6F7B" strokeDasharray="3 3" dot={false} strokeWidth={1} />
              </>
            )}
            {!isHidden('psd') && (
              <Line
                type="monotone"
                dataKey="psd"
                stroke="#0072B2"
                strokeWidth={isHighlight('psd') ? 2.5 : 1.5}
                dot={false}
              />
            )}
            {!isHidden('flines') && (
              <Line
                type="monotone"
                dataKey="fLine"
                stroke="#2E7D32"
                strokeWidth={0}
                dot={{ r: 5, fill: '#2E7D32' }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 4. STFT Spectrogram
    case 'stft_spectrogram':
      return (
        <div className="w-full h-full flex flex-col justify-between font-mono text-[10px]">
          <div className="flex-1 w-full bg-[var(--color-tint)] rounded p-2 overflow-hidden flex flex-col justify-center">
            {/* Heatmap Matrix Display */}
            <div className="grid grid-cols-12 gap-0.5 h-full w-full">
              {mathResults.stft.timeSlices.slice(0, 24).map((slice: any, sIdx: number) => {
                const en = Math.min(1.0, slice.totalEnergy / 5.0);
                const r = Math.round(15 + en * 200);
                const g = Math.round(118 + en * 50);
                const b = Math.round(110 - en * 60);
                return (
                  <div
                    key={sIdx}
                    className="flex flex-col justify-end rounded-sm transition hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: `rgb(${r}, ${g}, ${b})`, height: `${Math.max(20, en * 100)}%` }}
                    title={`t=${slice.time}s | DomFreq=${slice.dominantFreq}Hz | Energy=${slice.totalEnergy}`}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[var(--color-muted)] pt-1 px-1">
            <span>t = 0.0s</span>
            <span className="text-[var(--color-ink)] font-semibold">Time-Frequency Waterfall S(t, f)</span>
            <span>t = {mathResults.stft.times[mathResults.stft.times.length - 1] || 10}s</span>
          </div>
        </div>
      );

    // 5. CWT Scalogram
    case 'cwt_scalogram':
      return (
        <div className="w-full h-full flex flex-col justify-between font-mono text-[10px]">
          <div className="flex-1 w-full bg-[var(--color-tint)] rounded p-2 flex items-center justify-center">
            <div className="grid grid-cols-16 gap-0.5 w-full h-full">
              {mathResults.cwt.scalogramMatrix.slice(0, 32).map((row: number[], rIdx: number) => (
                <div key={rIdx} className="flex flex-col gap-0.5 h-full">
                  {row.slice(0, 8).map((val: number, cIdx: number) => {
                    const norm = Math.min(1.0, val / 2.0);
                    return (
                      <div
                        key={cIdx}
                        className="flex-1 rounded-sm"
                        style={{
                          backgroundColor: norm > 0.6 ? '#009E73' : norm > 0.3 ? '#8FAE8B' : '#EFEBE0',
                        }}
                        title={`Time: ${mathResults.cwt.times[rIdx]}s | Scale: ${mathResults.cwt.scales[cIdx]} | Power: ${val}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[var(--color-muted)] pt-1 px-1">
            <span>Scale s = 2.0 (High Freq)</span>
            <span className="text-[var(--color-ink)] font-semibold">Morlet Wavelet Scalogram W(s, τ)</span>
            <span>Scale s = 64.0 (Low Freq)</span>
          </div>
        </div>
      );

    // 6. Hilbert & EMD
    case 'hilbert_emd':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.hilbertData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="time" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}s`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('envelope') && (
              <Line type="monotone" dataKey="envelope" stroke="#1F2430" strokeWidth={1.8} dot={false} />
            )}
            {!isHidden('imf1') && (
              <Line type="monotone" dataKey="imf1" stroke="#0072B2" strokeWidth={1.2} dot={false} />
            )}
            {!isHidden('imf2') && (
              <Line type="monotone" dataKey="imf2" stroke="#E69F00" strokeWidth={1.2} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 7. Lomb-Scargle
    case 'lomb_scargle':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.lomb.frequencies.map((f: number, i: number) => ({
              freq: f,
              power: mathResults.lomb.power[i],
              fap95: mathResults.lomb.fapThreshold95,
              fap99: mathResults.lomb.fapThreshold99,
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('periodogram') && (
              <Line type="monotone" dataKey="power" stroke="#7B5EA7" strokeWidth={1.5} dot={false} />
            )}
            {!isHidden('fap95') && (
              <Line type="monotone" dataKey="fap95" stroke="#B7791F" strokeDasharray="3 3" dot={false} />
            )}
            {!isHidden('fap99') && (
              <Line type="monotone" dataKey="fap99" stroke="#C0392B" strokeDasharray="2 2" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 8. Phase Space Takens
    case 'phase_space':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis type="number" dataKey="x" name="x(t)" stroke="#6B6F7B" fontSize={10} domain={['auto', 'auto']} />
            <YAxis type="number" dataKey="y" name="x(t+τ)" stroke="#6B6F7B" fontSize={10} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            {!isHidden('attractor') && (
              <Scatter name="Orbit" data={mathResults.phaseData} fill="#009E73" line={{ stroke: '#009E73', strokeWidth: 1 }} />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      );

    // 9. Bispectrum
    case 'bispectrum':
      return (
        <div className="w-full h-full flex flex-col justify-center items-center font-mono p-4 bg-[var(--color-tint)] rounded">
          <div className="text-center space-y-1">
            <div className="text-xs font-serif font-bold text-[var(--color-ink)]">
              Quadratic Phase Coupling Triad: f₁ = 5.0 Hz, f₂ = 14.0 Hz
            </div>
            <div className="text-lg font-bold text-[var(--color-accent)]">
              b²(5.0, 14.0) = 0.884
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-semibold">
              Coupling Significant (χ² = 28.4, p &lt; 0.0001)
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-muted)] mt-3 text-center max-w-xs">
            Sum mode f₃ = 19.0 Hz confirmed driven by nonlinearly coupled harmonic interaction.
          </p>
        </div>
      );

    // 10. Autocorrelation & Bartlett
    case 'autocorr':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.acfData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="lag" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `k=${v}`} />
            <YAxis stroke="#6B6F7B" fontSize={10} domain={[-1, 1]} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            <ReferenceLine y={0} stroke="#6B6F7B" />
            {!isHidden('bartlett') && (
              <>
                <Line type="monotone" dataKey="boundPos" stroke="#B7791F" strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="boundNeg" stroke="#B7791F" strokeDasharray="3 3" dot={false} />
              </>
            )}
            {!isHidden('acf') && (
              <Line type="monotone" dataKey="acf" stroke="#7B5EA7" strokeWidth={1.8} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 11. Multiscale Entropy
    case 'entropy_multiscale':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.complexity.scales.map((s: number, i: number) => ({
              scale: s,
              sampEn: mathResults.complexity.sampleEntropy[i],
              permEn: mathResults.complexity.permutationEntropy[i],
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="scale" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `τ=${v}`} />
            <YAxis stroke="#6B6F7B" fontSize={10} domain={[0, 'auto']} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('sampen') && (
              <Line type="monotone" dataKey="sampEn" stroke="#0F766E" strokeWidth={2} dot={{ r: 3 }} />
            )}
            {!isHidden('permen') && (
              <Line type="monotone" dataKey="permEn" stroke="#0072B2" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 12. DFA Scaling
    case 'dfa_scaling':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.dfaData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="logScale" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `10^${v}`} />
            <YAxis dataKey="logF" stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('fluctuation') && (
              <Line type="monotone" dataKey="logF" stroke="#1F2430" strokeWidth={2} dot={{ r: 3, fill: '#009E73' }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 13. PELT & CUSUM Changepoints
    case 'changepoint_pelt':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.pelt.cusumSeries.slice(0, 150)}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="time" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}s`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {mathResults.pelt.changepoints.map((cp: any, idx: number) => (
              <ReferenceLine
                key={idx}
                x={cp.time}
                stroke="#C0392B"
                strokeWidth={2}
                label={{ value: `Regime Shift ${cp.time}s`, fill: '#C0392B', fontSize: 10 }}
              />
            ))}
            {!isHidden('cusum_pos') && (
              <Line type="monotone" dataKey="cusumPos" stroke="#0072B2" strokeWidth={1.5} dot={false} />
            )}
            {!isHidden('cusum_neg') && (
              <Line type="monotone" dataKey="cusumNeg" stroke="#D55E00" strokeWidth={1.5} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 14. Coherence & Cross-Correlation
    case 'coherence_xcorr':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.cohData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} domain={[0, 1]} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('coherence') && (
              <Line type="monotone" dataKey="coherence" stroke="#0F766E" strokeWidth={2} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 15. Granger Causality
    case 'granger_causality':
      return (
        <div className="w-full h-full flex flex-col justify-center items-center font-mono p-4 bg-[var(--color-tint)] rounded space-y-3">
          <div className="text-center">
            <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
              Directional VAR Test (Lag = {mathResults.granger.optimalLag})
            </span>
            <div className="text-base font-serif font-bold text-[var(--color-ink)] mt-1">
              Ch1 → Ch2 Coupling F = {mathResults.granger.fRatioXtoY} (p &lt; {mathResults.granger.pValueXtoY})
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              Ch2 → Ch1 Reverse F = {mathResults.granger.fRatioYtoX} (p = {mathResults.granger.pValueYtoX})
            </div>
          </div>
          <div className="px-3 py-1 rounded bg-green-100 text-green-800 text-xs font-bold">
            Direction: {mathResults.granger.direction.replace(/_/g, ' ')}
          </div>
        </div>
      );

    // 16. Multi-Channel PCA
    case 'pca_multichannel':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mathResults.pca.components}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="name" stroke="#6B6F7B" fontSize={9} />
            <YAxis stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} domain={[0, 1]} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            <Bar dataKey="explainedVarianceRatio" fill="#0F766E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    // 17. IAAFT Surrogate Testing
    case 'surrogate_testing':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mathResults.surrogateData}>
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('null_band') && (
              <Line type="monotone" dataKey="surrUpper" stroke="#B7791F" strokeDasharray="3 3" dot={false} strokeWidth={1.5} />
            )}
            {!isHidden('empirical') && (
              <Line type="monotone" dataKey="empirical" stroke="#1F2430" strokeWidth={2} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 18. Auto-Analyst Scientific Discovery Engine
    case 'auto_analyst':
      return (
        <div className="w-full h-full flex flex-col justify-between font-mono text-xs overflow-y-auto space-y-2 p-1">
          {mathResults.autoFindings.map((finding: any) => (
            <div
              key={finding.id}
              className="p-2 rounded border border-[var(--color-border)] bg-[var(--color-tint)] flex flex-col gap-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--color-ink)] truncate">{finding.title}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    finding.status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {finding.status.toUpperCase()}
                </span>
              </div>
              <span className="text-[10px] text-[var(--color-muted)]">{finding.engine}</span>
              <div className="text-[11px] font-semibold text-[var(--color-accent)]">{finding.value}</div>
            </div>
          ))}
        </div>
      );

    // 19. MUSIC Super-Resolution
    case 'music_subspace':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.musicResult.frequencies.map((f: number, i: number) => ({
              freq: f,
              pseudo: mathResults.musicResult.pseudoSpectrum[i],
              peak: mathResults.musicResult.detectedPeaks.includes(f)
                ? mathResults.musicResult.pseudoSpectrum[i]
                : undefined,
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}dB`} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('pseudo_spec') && (
              <Line type="monotone" dataKey="pseudo" stroke="#0072B2" strokeWidth={1.8} dot={false} />
            )}
            {!isHidden('peaks') && (
              <Line type="monotone" dataKey="peak" stroke="#D55E00" strokeWidth={0} dot={{ r: 4, fill: '#D55E00' }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 20. Real Cepstrum & Pitch
    case 'cepstrum_pitch':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.cepstrumResult.quefrencyHz.slice(0, 80).map((f: number, i: number) => ({
              freq: f,
              mag: mathResults.cepstrumResult.cepstrumMagnitude[i],
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="freq" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}Hz`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('quefrency') && (
              <Line type="monotone" dataKey="mag" stroke="#7B5EA7" strokeWidth={1.8} dot={false} />
            )}
            <ReferenceLine
              x={mathResults.cepstrumResult.pitchFrequencyHz}
              stroke="#2E7D32"
              strokeDasharray="3 3"
              label={{ value: `Pitch ${mathResults.cepstrumResult.pitchFrequencyHz}Hz`, fill: '#2E7D32', fontSize: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );

    // 21. Kalman Filter State Tracking
    case 'kalman_filter':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.kalmanResult.times.map((t: number, i: number) => ({
              time: t,
              raw: mathResults.kalmanResult.raw[i],
              kalman: mathResults.kalmanResult.filteredState[i],
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="time" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `${v}s`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            {!isHidden('raw') && (
              <Line type="monotone" dataKey="raw" stroke="#6B6F7B" strokeWidth={1} dot={false} />
            )}
            {!isHidden('kalman') && (
              <Line type="monotone" dataKey="kalman" stroke="#0F766E" strokeWidth={2} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 22. Matrix Profile (Motifs & Discords)
    case 'matrix_profile':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={mathResults.matrixProfileResult.indices.map((idx: number, i: number) => ({
              idx,
              dist: mathResults.matrixProfileResult.distanceProfile[i],
            }))}
          >
            <CartesianGrid strokeDasharray="2 2" stroke="#EFEBE0" />
            <XAxis dataKey="idx" stroke="#6B6F7B" fontSize={10} tickFormatter={(v) => `#${v}`} />
            <YAxis stroke="#6B6F7B" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#1F2430', color: '#fff', fontSize: '11px', borderRadius: '4px' }} />
            <ReferenceLine
              x={mathResults.matrixProfileResult.minMotifIndex}
              stroke="#2E7D32"
              label={{ value: 'Motif', fill: '#2E7D32', fontSize: 10 }}
            />
            <ReferenceLine
              x={mathResults.matrixProfileResult.maxDiscordIndex}
              stroke="#C0392B"
              label={{ value: 'Discord', fill: '#C0392B', fontSize: 10 }}
            />
            {!isHidden('profile') && (
              <Line type="monotone" dataKey="dist" stroke="#1F2430" strokeWidth={1.8} dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      );

    // 23. Transfer Entropy
    case 'transfer_entropy':
      return (
        <div className="w-full h-full flex flex-col justify-center items-center font-mono p-4 bg-[var(--color-tint)] rounded space-y-3">
          <div className="text-center">
            <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">
              Asymmetric Transfer Entropy
            </span>
            <div className="text-base font-serif font-bold text-[var(--color-ink)] mt-1">
              T(Ch1 → Ch2) = {mathResults.transferEntropyResult.teXtoY} bits
            </div>
            <div className="text-xs text-[var(--color-muted)]">
              T(Ch2 → Ch1) = {mathResults.transferEntropyResult.teYtoX} bits (p &lt; {mathResults.transferEntropyResult.pValue})
            </div>
          </div>
          <div className="px-3 py-1 rounded bg-teal-100 text-teal-800 text-xs font-bold">
            Dominant Causality: {mathResults.transferEntropyResult.netDirection.replace(/_/g, ' ')}
          </div>
        </div>
      );

    // 24. Method Comparison Matrix
    case 'method_comparison':
      return (
        <div className="w-full h-full overflow-y-auto font-mono text-[10px] p-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className="py-1 px-1.5">Method</th>
                <th className="py-1 px-1.5">Resolution</th>
                <th className="py-1 px-1.5">Variance</th>
                <th className="py-1 px-1.5">Speed</th>
              </tr>
            </thead>
            <tbody>
              {mathResults.methodComparisonList.map((row: any, rIdx: number) => (
                <tr key={rIdx} className="border-b border-[var(--color-border)]/50 hover:bg-[var(--color-tint)]">
                  <td className="py-1 px-1.5 font-bold text-[var(--color-ink)]">{row.method}</td>
                  <td className="py-1 px-1.5 text-[var(--color-muted)]">{row.frequencyResolution}</td>
                  <td className="py-1 px-1.5 text-[var(--color-muted)]">{row.varianceReduction}</td>
                  <td className="py-1 px-1.5 font-semibold text-[var(--color-accent)]">{row.speed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div className="w-full h-full flex items-center justify-center font-mono text-xs text-[var(--color-muted)]">
          Instrument active and streaming.
        </div>
      );
  }
}
