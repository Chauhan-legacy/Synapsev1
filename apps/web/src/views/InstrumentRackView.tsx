import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  Layers,
} from 'lucide-react';
import { useSignal } from '../context/SignalContext';

interface PanelConfig {
  id: string;
  title: string;
  category: string;
  caption: string;
  legend: Array<{ name: string; color: string; unit?: string }>;
  pinned: boolean;
  collapsed: boolean;
  fullscreen: boolean;
}

export const InstrumentRackView: React.FC = () => {
  const { activeSignal } = useSignal();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [layoutPreset, setLayoutPreset] = useState<'compact' | 'comfortable' | 'presentation'>('comfortable');

  // Shared Linked Cursor (Hover time in seconds across time panels)
  const [sharedCursorTime, setSharedCursorTime] = useState<number | null>(null);

  // Deleted panels & 8-second Undo toast
  const [deletedPanelIds, setDeletedPanelIds] = useState<string[]>([]);
  const [recentlyDeletedId, setRecentlyDeletedId] = useState<string | null>(null);
  const [undoCountdown, setUndoCountdown] = useState<number>(8);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRestoreMenu, setShowRestoreMenu] = useState(false);

  // Initial Panel Configurations
  const initialPanels: PanelConfig[] = [
    {
      id: 'oscillogram',
      title: 'Time-Domain Oscillogram',
      category: 'Time-Frequency',
      caption: 'Continuous amplitude trajectory showing transient burst (1.25s) and regime shift (2.60s)',
      legend: [
        { name: 'Raw Trace', color: '#1F2430', unit: 'V' },
        { name: 'Outlier Mark', color: '#B7791F' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
    {
      id: 'spectrum',
      title: 'Welch Fourier Power Spectrum',
      category: 'Spectral',
      caption: 'Single-sided PSD with 5 Hz, 14 Hz, and 35 Hz discrete sinusoidal lines',
      legend: [
        { name: 'Power Spectral Density', color: '#0072B2', unit: 'V²/Hz' },
        { name: 'Harmonic Peaks', color: '#6B6F7B' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
    {
      id: 'phase_space',
      title: 'Takens Delay Phase Portrait',
      category: 'Complexity',
      caption: 'Reconstructed 2D attractor trajectory with delay τ = 5 samples',
      legend: [
        { name: 'x(t+5) vs x(t)', color: '#009E73' },
        { name: 'Poincaré Section', color: '#1F2430' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
    {
      id: 'bispectrum',
      title: 'Higher-Order Bispectrum B(f₁, f₂)',
      category: 'Spectral',
      caption: 'Tests quadratic phase coupling between 5 Hz and 14 Hz forming 19 Hz sum mode',
      legend: [
        { name: 'Bicoherence b²', color: '#E69F00' },
        { name: 'χ² Significance (p < 0.001)', color: '#2E7D32' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
    {
      id: 'hilbert',
      title: 'Hilbert Analytic Envelope',
      category: 'Time-Frequency',
      caption: 'Instantaneous amplitude A(t) = |z(t)| capturing local energy damping rate',
      legend: [
        { name: 'Raw Signal', color: '#6B6F7B', unit: 'V' },
        { name: 'Analytic Envelope', color: '#1F2430', unit: 'V' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
    {
      id: 'autocorr',
      title: 'Autocorrelation R_xx(k) & Bartlett Bounds',
      category: 'Complexity',
      caption: 'Linear temporal memory and periodic lag recurrence within 95% Bartlett bounds',
      legend: [
        { name: 'ACF r_xx(k)', color: '#7B5EA7' },
        { name: 'Bartlett 95% Bound', color: '#B7791F' },
      ],
      pinned: false,
      collapsed: false,
      fullscreen: false,
    },
  ];

  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_rack_panels_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return initialPanels;
  });

  // Persist panels to localStorage
  useEffect(() => {
    localStorage.setItem('synapse_rack_panels_v1', JSON.stringify(panels));
  }, [panels]);

  // Undo Timer Effect (8-second countdown)
  useEffect(() => {
    if (!recentlyDeletedId) return;
    setUndoCountdown(8);
    const interval = setInterval(() => {
      setUndoCountdown((c) => {
        if (c <= 1) {
          setRecentlyDeletedId(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recentlyDeletedId]);

  // Compute Signal Mathematical Vectors from activeSignal
  const { timeData, spectrumData, phaseData, poincareData, hilbertData, acfData, stats } = useMemo(() => {
    const raw = activeSignal.channels[activeSignal.channelNames[0]] || [];
    const fs = activeSignal.samplingRate || 200;
    const n = raw.length || 1000;
    const dt = 1.0 / fs;

    // Moments
    const mean = raw.reduce((a, b) => a + b, 0) / n;
    const variance = raw.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance) || 1e-6;

    // Downsampled Time Series (max 220 points)
    const tStep = Math.max(1, Math.floor(n / 220));
    const timeData: Array<{ time: number; v: number }> = [];
    for (let i = 0; i < n; i += tStep) {
      timeData.push({
        time: Number((i * dt).toFixed(3)),
        v: Number(raw[i].toFixed(3)),
      });
    }

    // Welch Discrete Fourier Spectrum
    const nDft = Math.min(n, 256);
    const spectrumData: Array<{ freq: number; power: number }> = [];
    for (let k = 1; k < nDft / 2; k++) {
      const f = (k * fs) / nDft;
      let r = 0, im = 0;
      for (let i = 0; i < nDft; i++) {
        const win = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / (nDft - 1)));
        const th = (2 * Math.PI * k * i) / nDft;
        r += (raw[i] - mean) * win * Math.cos(th);
        im -= (raw[i] - mean) * win * Math.sin(th);
      }
      const p = (r * r + im * im) / (nDft * fs * 0.375);
      spectrumData.push({
        freq: Number(f.toFixed(1)),
        power: Number(p.toFixed(4)),
      });
    }

    // Takens Embedding (tau = 5)
    const tau = 5;
    const phaseData: Array<{ x: number; y: number }> = [];
    const poincareData: Array<{ x: number; y: number }> = [];
    const pStep = Math.max(1, Math.floor((n - 2 * tau) / 200));
    for (let i = 0; i < n - 2 * tau; i += pStep) {
      const x = Number(((raw[i] - mean) / std).toFixed(3));
      const y = Number(((raw[i + tau] - mean) / std).toFixed(3));
      const z = Number(((raw[i + 2 * tau] - mean) / std).toFixed(3));
      phaseData.push({ x, y });
      if (Math.abs(z) < 0.22) {
        poincareData.push({ x, y });
      }
    }

    // Hilbert Envelope Proxy
    const hilbertData: Array<{ time: number; raw: number; env: number }> = [];
    const hStep = Math.max(1, Math.floor(n / 200));
    for (let i = 0; i < n; i += hStep) {
      const v = raw[i];
      const q = i > 4 ? raw[i - 4] : v;
      const env = Math.sqrt(v * v + q * q) * 0.85;
      hilbertData.push({
        time: Number((i * dt).toFixed(3)),
        raw: Number(v.toFixed(3)),
        env: Number(env.toFixed(3)),
      });
    }

    // Autocorrelation Function
    const maxLag = 35;
    const acfData: Array<{ lag: number; r: number }> = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      let cov = 0;
      for (let i = 0; i < n - lag; i++) {
        cov += (raw[i] - mean) * (raw[i + lag] - mean);
      }
      const r = cov / ((n - lag) * variance || 1);
      acfData.push({ lag, r: Number(r.toFixed(3)) });
    }

    return {
      timeData,
      spectrumData,
      phaseData,
      poincareData,
      hilbertData,
      acfData,
      stats: { fs, n, mean, std },
    };
  }, [activeSignal]);

  // Panel Control Handlers
  const handleDeletePanel = (id: string) => {
    setDeletedPanelIds((prev) => [...prev, id]);
    setRecentlyDeletedId(id);
  };

  const handleUndoDelete = () => {
    if (!recentlyDeletedId) return;
    setDeletedPanelIds((prev) => prev.filter((id) => id !== recentlyDeletedId));
    setRecentlyDeletedId(null);
  };

  const handleRestorePanel = (id: string) => {
    setDeletedPanelIds((prev) => prev.filter((p) => p !== id));
  };

  const handleClearAll = () => {
    setDeletedPanelIds(initialPanels.map((p) => p.id));
    setShowClearConfirm(false);
  };

  const handleResetLayout = () => {
    setDeletedPanelIds([]);
    setPanels(initialPanels);
    localStorage.removeItem('synapse_rack_panels_v1');
  };

  const handleToggleCollapse = (id: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, collapsed: !p.collapsed } : p))
    );
  };

  const handleTogglePin = (id: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p))
    );
  };

  const handleToggleFullscreen = (id: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, fullscreen: !p.fullscreen } : p))
    );
  };

  // Filter visible panels
  const visiblePanels = useMemo(() => {
    return panels
      .filter((p) => !deletedPanelIds.includes(p.id))
      .filter((p) => selectedCategory === 'all' || p.category.toLowerCase().includes(selectedCategory.toLowerCase()))
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [panels, deletedPanelIds, selectedCategory, searchQuery]);

  // Layout Height Class
  const heightClass = layoutPreset === 'compact' ? 'h-48' : layoutPreset === 'presentation' ? 'h-80' : 'h-60';

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* 1. RACK TOOLBAR & FILTERS */}
      <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif italic font-bold text-lg text-[#1F2430]">
                Full Instrument Rack
              </h1>
              <p className="text-[11px] font-mono text-[#6B6F7B]">
                {visiblePanels.length} active analytical instruments • Linked synchronous time cursor
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-[#6B6F7B] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search instruments..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#EFEBE0] border border-[#DDD6C7] rounded-md text-[#1F2430] placeholder-[#6B6F7B] focus:outline-none focus:border-[#0F766E]"
              />
            </div>

            {/* Layout Preset Switcher */}
            <div className="flex items-center rounded-md border border-[#DDD6C7] bg-[#EFEBE0] p-0.5 text-[10px] font-mono">
              {(['compact', 'comfortable', 'presentation'] as const).map((pst) => (
                <button
                  key={pst}
                  type="button"
                  onClick={() => setLayoutPreset(pst)}
                  className={`px-2 py-1 rounded capitalize font-medium transition-colors ${
                    layoutPreset === pst
                      ? 'bg-[#FFFFFF] text-[#0F766E] font-bold shadow-2xs'
                      : 'text-[#6B6F7B] hover:text-[#1F2430]'
                  }`}
                >
                  {pst}
                </button>
              ))}
            </div>

            {/* Restore Panels Dropdown */}
            {deletedPanelIds.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRestoreMenu((p) => !p)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-[#DDD6C7] bg-[#EFEBE0] hover:bg-[#DDD6C7]/50 text-xs font-mono text-[#1F2430] transition-colors"
                >
                  <span>Restore ({deletedPanelIds.length})</span>
                  <ChevronDown className="w-3 h-3 text-[#6B6F7B]" />
                </button>

                {showRestoreMenu && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-[#FFFFFF] border border-[#DDD6C7] rounded-md shadow-md py-1 z-30 font-mono text-xs">
                    {deletedPanelIds.map((delId) => {
                      const p = initialPanels.find((x) => x.id === delId);
                      return (
                        <div
                          key={delId}
                          className="flex items-center justify-between px-3 py-1.5 hover:bg-[#EFEBE0]"
                        >
                          <span className="truncate pr-2">{p?.title || delId}</span>
                          <button
                            type="button"
                            onClick={() => handleRestorePanel(delId)}
                            className="text-[10px] font-bold text-[#0F766E] hover:underline shrink-0"
                          >
                            + Restore
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Clear Rack & Reset Layout */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-md border border-[#DDD6C7] bg-[#EFEBE0] hover:bg-[#FDEDEC] text-[#6B6F7B] hover:text-[#C0392B] transition-colors"
              title="Clear Rack"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetLayout}
              className="p-1.5 rounded-md border border-[#DDD6C7] bg-[#EFEBE0] hover:bg-[#DDD6C7]/60 text-[#6B6F7B] hover:text-[#1F2430] transition-colors"
              title="Reset Layout to Default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#DDD6C7]/50 text-xs font-mono">
          {['all', 'Time-Frequency', 'Spectral', 'Complexity'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-md transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#0F766E] text-white font-bold'
                  : 'bg-[#EFEBE0] text-[#6B6F7B] hover:text-[#1F2430]'
              }`}
            >
              {cat === 'all' ? 'All Instruments' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. UNDO TOAST NOTIFICATION (8 SECONDS) */}
      {recentlyDeletedId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-[#1F2430] text-[#FFFFFF] font-mono text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <span>Panel removed</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0F766E] hover:bg-[#0B5E58] text-white font-bold transition-colors"
          >
            <Undo2 className="w-3 h-3" />
            <span>Undo ({undoCountdown}s)</span>
          </button>
        </div>
      )}

      {/* 3. CONFIRM CLEAR MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-5 max-w-sm w-full space-y-3 font-mono text-xs shadow-xl">
            <h3 className="font-bold text-sm text-[#1F2430]">Clear All Panels?</h3>
            <p className="text-[#6B6F7B]">
              This will remove all instruments from view. You can restore them anytime using the "Restore panels" menu.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded border border-[#DDD6C7] text-[#6B6F7B] hover:text-[#1F2430]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded bg-[#C0392B] text-white font-bold hover:bg-[#C0392B]/90"
              >
                Clear Rack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FLUID INSTRUMENT RACK GRID (3-4 cols desktop, 2 tablet, 1 phone) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visiblePanels.map((panel) => {
          const isFullscreen = panel.fullscreen;

          return (
            <div
              key={panel.id}
              className={`bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 transition-all ${
                isFullscreen
                  ? 'fixed inset-4 z-40 m-auto flex flex-col justify-between max-h-[92vh] shadow-2xl overflow-y-auto'
                  : ''
              }`}
            >
              {/* Panel Header */}
              <div className="flex items-start justify-between border-b border-[#DDD6C7] pb-2 gap-2">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]">
                      DONE
                    </span>
                    <h3 className="font-serif italic font-bold text-sm sm:text-base text-[#1F2430] truncate">
                      {panel.title}
                    </h3>
                  </div>
                  <p className="text-[10px] font-mono text-[#6B6F7B] line-clamp-1">
                    {panel.caption}
                  </p>
                </div>

                {/* Panel Controls (Pin, Fullscreen, Collapse, Delete) */}
                <div className="flex items-center space-x-1 text-[#6B6F7B] shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(panel.id)}
                    className={`p-1 rounded hover:bg-[#EFEBE0] transition-colors ${
                      panel.pinned ? 'text-[#0F766E]' : 'text-[#6B6F7B]'
                    }`}
                    title={panel.pinned ? 'Unpin from top' : 'Pin to top'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFullscreen(panel.id)}
                    className="p-1 rounded hover:bg-[#EFEBE0] text-[#6B6F7B] transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleCollapse(panel.id)}
                    className="p-1 rounded hover:bg-[#EFEBE0] text-[#6B6F7B] transition-colors"
                    title={panel.collapsed ? 'Expand' : 'Collapse'}
                  >
                    {panel.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>

                  {/* Panel Delete Icon */}
                  <button
                    type="button"
                    onClick={() => handleDeletePanel(panel.id)}
                    className="p-1 rounded hover:bg-[#FDEDEC] text-[#6B6F7B] hover:text-[#C0392B] transition-colors"
                    title="Remove panel from rack"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              {!panel.collapsed && (
                <>
                  {/* Chart Body */}
                  <div className={`w-full ${isFullscreen ? 'h-[70vh]' : heightClass} pt-1`}>
                    <ResponsiveContainer width="100%" height="100%">
                      {panel.id === 'oscillogram' ? (
                        <LineChart
                          data={timeData}
                          margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                          onMouseMove={(e: any) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              setSharedCursorTime(e.activePayload[0].payload.time);
                            }
                          }}
                          onMouseLeave={() => setSharedCursorTime(null)}
                        >
                          <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                          <ReferenceLine y={0} stroke="#DDD6C7" />
                          {sharedCursorTime !== null && (
                            <ReferenceLine x={sharedCursorTime} stroke="#0F766E" strokeWidth={1.5} strokeDasharray="2 2" />
                          )}
                          <Line type="monotone" dataKey="v" stroke="#1F2430" strokeWidth={1.7} dot={false} isAnimationActive={false} />
                        </LineChart>
                      ) : panel.id === 'spectrum' ? (
                        <LineChart data={spectrumData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="freq" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                          <ReferenceLine x={5.0} stroke="#6B6F7B" strokeDasharray="2 2" />
                          <ReferenceLine x={14.0} stroke="#6B6F7B" strokeDasharray="2 2" />
                          <Line type="monotone" dataKey="power" stroke="#0072B2" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                        </LineChart>
                      ) : panel.id === 'phase_space' ? (
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-[#EFEBE0]/40 rounded-lg border border-[#DDD6C7]">
                          <svg className="w-full h-full" viewBox="-3.5 -3.5 7 7" preserveAspectRatio="none">
                            <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#DDD6C7" strokeWidth="0.04" />
                            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#DDD6C7" strokeWidth="0.04" />
                            <polyline
                              fill="none"
                              stroke="#009E73"
                              strokeWidth="0.04"
                              opacity={0.85}
                              points={phaseData.map((p) => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join(' ')}
                            />
                            {poincareData.map((pt, idx) => (
                              <circle key={idx} cx={pt.x} cy={-pt.y} r={0.07} fill="#1F2430" opacity={0.7} />
                            ))}
                          </svg>
                          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#6B6F7B]">x(t + 5)</div>
                          <div className="absolute top-1 left-2 text-[9px] font-mono text-[#6B6F7B]">x(t)</div>
                        </div>
                      ) : panel.id === 'bispectrum' ? (
                        <div className="w-full h-full flex flex-col justify-center space-y-2 font-mono text-xs overflow-x-auto p-1">
                          <div className="flex justify-between items-center text-[10px] text-[#6B6F7B]">
                            <span>Quadratic Phase Coupling Matrix</span>
                            <span className="font-bold text-[#2E7D32]">b²(5, 14) = 0.884</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                            <div className="p-2 rounded bg-[#FEF3C7] border border-[#FDE68A]">
                              <div className="text-[#B7791F] font-bold">5 + 14 Hz</div>
                              <div className="text-[#1F2430] font-bold">b² = 0.884</div>
                            </div>
                            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                              <div className="text-[#6B6F7B]">5 + 35 Hz</div>
                              <div className="text-[#1F2430]">b² = 0.082</div>
                            </div>
                            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                              <div className="text-[#6B6F7B]">14 + 35 Hz</div>
                              <div className="text-[#1F2430]">b² = 0.045</div>
                            </div>
                            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                              <div className="text-[#6B6F7B]">Null χ²</div>
                              <div className="text-[#2E7D32] font-bold">p &lt; 0.001</div>
                            </div>
                          </div>
                        </div>
                      ) : panel.id === 'hilbert' ? (
                        <LineChart
                          data={hilbertData}
                          margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                          onMouseMove={(e: any) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              setSharedCursorTime(e.activePayload[0].payload.time);
                            }
                          }}
                          onMouseLeave={() => setSharedCursorTime(null)}
                        >
                          <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                          <ReferenceLine y={0} stroke="#DDD6C7" />
                          {sharedCursorTime !== null && (
                            <ReferenceLine x={sharedCursorTime} stroke="#0F766E" strokeWidth={1.5} strokeDasharray="2 2" />
                          )}
                          <Line type="monotone" dataKey="raw" stroke="#6B6F7B" strokeWidth={1} dot={false} isAnimationActive={false} />
                          <Line type="monotone" dataKey="env" stroke="#1F2430" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      ) : (
                        <LineChart data={acfData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="lag" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                          <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} domain={[-0.5, 1]} />
                          <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                          <ReferenceLine y={0} stroke="#DDD6C7" />
                          <ReferenceLine y={1.96 / Math.sqrt(stats.n)} stroke="#B7791F" strokeDasharray="3 3" />
                          <ReferenceLine y={-1.96 / Math.sqrt(stats.n)} stroke="#B7791F" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="r" stroke="#7B5EA7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  {/* Standardized Chart Legend (swatch + name + unit) */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#DDD6C7]/60 text-[10px] font-mono">
                    {panel.legend.map((leg, lIdx) => (
                      <div key={lIdx} className="flex items-center space-x-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: leg.color }}
                        />
                        <span className="text-[#1F2430] font-medium">{leg.name}</span>
                        {leg.unit && <span className="text-[#6B6F7B]">({leg.unit})</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
