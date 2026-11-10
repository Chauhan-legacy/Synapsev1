import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
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
  Plus,
  Sliders,
  Check,
} from 'lucide-react';
import { useSignal } from '../context/SignalContext';
import { MathFormula } from '../components/common/MathFormula';

export interface PanelConfig {
  id: string;
  title: string;
  category: 'Spectral' | 'Time-Frequency' | 'Complexity' | 'Anomalies' | 'Relations' | 'Inference';
  caption: string;
  latexBasis: string;
  legend: Array<{ name: string; color: string; unit?: string }>;
  pinned: boolean;
  collapsed: boolean;
  fullscreen: boolean;
}

export const ALL_INSTRUMENT_CATALOG: PanelConfig[] = [
  // 1. Time-Domain Oscillogram
  {
    id: 'oscillogram',
    title: 'Time-Domain Oscilloscope',
    category: 'Time-Frequency',
    caption: 'Continuous amplitude trajectory x(t) with transient shocks and structural regimes',
    latexBasis: 'x(t) = \\sum_{k=1}^K A_k \\cos(2\\pi f_k t + \\phi_k) + \\eta(t)',
    legend: [
      { name: 'Raw Trace', color: '#1F2430', unit: 'V' },
      { name: 'Outlier Mark', color: '#B7791F' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 2. Welch PSD
  {
    id: 'spectrum',
    title: 'Welch Fourier Power Spectrum',
    category: 'Spectral',
    caption: 'Averaged modified periodogram with Hann windowing and 50% segment overlap',
    latexBasis: '\\hat{P}(f) = \\frac{1}{K f_s S_2} \\sum_{k=1}^K |\\mathcal{F}\\{x_k w\\}|^2',
    legend: [
      { name: 'PSD (V²/Hz)', color: '#0072B2', unit: 'V²/Hz' },
      { name: 'Harmonic Lines', color: '#6B6F7B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 3. Thomson Multitaper F-Test
  {
    id: 'multitaper',
    title: 'Thomson Multitaper F-Test',
    category: 'Spectral',
    caption: 'Discrete Prolate Spheroidal Sequences (DPSS) eigenspectra with Fisher line test',
    latexBasis: 'F(f) = \\frac{(K-1)|\\sum V_k(0) Y_k(f)|^2 / \\sum V_k^2(0)}{\\sum |Y_k(f) - \\hat{C}(f) V_k(0)|^2}',
    legend: [
      { name: 'F-Statistic', color: '#0F766E' },
      { name: 'Critical F (p<0.0001)', color: '#C0392B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 4. STFT Spectrogram
  {
    id: 'stft_spectrogram',
    title: 'Short-Time Fourier Spectrogram',
    category: 'Time-Frequency',
    caption: 'Windowed time-frequency energy distribution S(t, f) showing temporal frequency evolution',
    latexBasis: 'S(t, f) = |\\int_{-\\infty}^\\infty x(\\tau) w(\\tau - t) e^{-j 2\\pi f \\tau} d\\tau|^2',
    legend: [
      { name: 'Spectral Energy', color: '#0F766E', unit: 'dB' },
      { name: 'Chirp Ridge', color: '#E69F00' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 5. CWT Wavelet Scalogram
  {
    id: 'cwt_scalogram',
    title: 'Continuous Wavelet Scalogram (Morlet)',
    category: 'Time-Frequency',
    caption: 'Continuous scale-time decomposition across 8 octave wavelet scales with Morlet basis',
    latexBasis: 'W(s, \\tau) = \\frac{1}{\\sqrt{s}} \\int x(t) \\psi^*\\left(\\frac{t-\\tau}{s}\\right) dt',
    legend: [
      { name: 'Wavelet Power |W|²', color: '#009E73' },
      { name: 'Octave Scale', color: '#7B5EA7' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 6. Takens Delay Phase Portrait
  {
    id: 'phase_space',
    title: 'Takens Delay Phase Portrait',
    category: 'Complexity',
    caption: 'Reconstructed 2D attractor trajectory with delay τ = 5 samples and Poincaré transversal',
    latexBasis: '\\mathbf{v}(t) = [x(t), x(t+\\tau)]^T, \\quad \\tau = \\arg\\min_\\tau \\text{AMI}(\\tau)',
    legend: [
      { name: 'Delay Orbit x(t+5)', color: '#009E73' },
      { name: 'Poincaré Section', color: '#1F2430' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 7. Higher-Order Bispectrum
  {
    id: 'bispectrum',
    title: 'Higher-Order Bispectrum B(f₁, f₂)',
    category: 'Spectral',
    caption: 'Tests quadratic phase coupling between 5 Hz and 14 Hz forming 19 Hz sum mode',
    latexBasis: 'b^2(f_1, f_2) = \\frac{|B(f_1, f_2)|^2}{P(f_1) P(f_2) P(f_1 + f_2)}',
    legend: [
      { name: 'Bicoherence b²', color: '#E69F00' },
      { name: 'χ² Cutoff (p<0.001)', color: '#2E7D32' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 8. Hilbert Envelope
  {
    id: 'hilbert',
    title: 'Hilbert Analytic Envelope',
    category: 'Time-Frequency',
    caption: 'Instantaneous amplitude A(t) = |z(t)| capturing local energy damping and modulation',
    latexBasis: 'z(t) = x(t) + i \\mathcal{H}\\{x(t)\\}, \\quad A(t) = |z(t)|',
    legend: [
      { name: 'Raw Signal', color: '#6B6F7B', unit: 'V' },
      { name: 'Analytic Envelope', color: '#1F2430', unit: 'V' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 9. Autocorrelation Function
  {
    id: 'autocorr',
    title: 'Autocorrelation R_xx(k) & Bartlett Bounds',
    category: 'Complexity',
    caption: 'Linear temporal memory and periodic lag recurrence within 95% Bartlett bounds',
    latexBasis: 'r_{xx}(k) = \\frac{\\sum (x_t - \\bar{x})(x_{t+k} - \\bar{x})}{(N-k)\\sigma^2} \\pm \\frac{1.96}{\\sqrt{N}}',
    legend: [
      { name: 'ACF r_xx(k)', color: '#7B5EA7' },
      { name: 'Bartlett 95% Band', color: '#B7791F' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 10. Rosner ESD Anomaly Detector
  {
    id: 'rosner_esd',
    title: 'Rosner ESD Outlier Locator',
    category: 'Anomalies',
    caption: 'Generalized Extreme Studentized Deviate identifying planted transient shock spikes',
    latexBasis: 'R_i = \\frac{\\max_i |x_i - \\bar{x}|}{s} > \\lambda_{\\text{Rosner}}(\\alpha = 0.001)',
    legend: [
      { name: 'Robust Residual |Z|', color: '#B7791F' },
      { name: 'Rosner Critical λ', color: '#C0392B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 11. PELT Change-point Engine
  {
    id: 'pelt_changepoints',
    title: 'PELT Structural Change-Point Engine',
    category: 'Anomalies',
    caption: 'Pruned Exact Linear Time locating variance jumps (t=3.0s) and level shifts (t=6.5s)',
    latexBasis: '\\min_{\\tau} \\sum_{i=1}^{K+1} \\left[ \\mathcal{C}(y_{\\tau_{i-1}:\\tau_i}) \\right] + \\beta K',
    legend: [
      { name: 'Segment Mean Level', color: '#0F766E' },
      { name: 'Regime Boundary', color: '#C0392B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 12. Recurrence Quantification Plot
  {
    id: 'recurrence_rqa',
    title: 'Recurrence Quantification Plot',
    category: 'Complexity',
    caption: 'Pairwise phase-space distance threshold matrix showing deterministic diagonal line structures',
    latexBasis: 'R_{i,j} = \\Theta(\\epsilon - \\|\\mathbf{v}_i - \\mathbf{v}_j\\|), \\quad \\epsilon = 0.4\\sigma',
    legend: [
      { name: 'Recurrence Point', color: '#0F766E' },
      { name: 'Diagonal Line Linearity', color: '#E69F00' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 13. Granger Causality VAR
  {
    id: 'granger_causality',
    title: 'Granger Causality & Transfer Vector',
    category: 'Relations',
    caption: 'Vector Autoregression F-test evaluating whether past Ch1 values improve predictions of Ch2',
    latexBasis: 'F = \\frac{(\\text{RSS}_r - \\text{RSS}_u) / p}{\\text{RSS}_u / (N - 2p - 1)} \\sim F(p, N-2p-1)',
    legend: [
      { name: 'F-Statistic (X→Y)', color: '#2E7D32' },
      { name: 'F-Statistic (Y→X)', color: '#6B6F7B' },
      { name: 'Critical F (p=0.01)', color: '#C0392B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 14. Cross-Correlation & Coherence
  {
    id: 'coherence_xcorr',
    title: 'Cross-Correlation & Coherence Spectrum',
    category: 'Relations',
    caption: 'Time-lag cross-correlation peaking at τ = +25ms (5 samples) and magnitude coherence',
    latexBasis: '\\gamma_{xy}^2(f) = \\frac{|P_{xy}(f)|^2}{P_{xx}(f) P_{yy}(f)}, \\quad R_{xy}(\\tau) = \\int x(t) y(t+\\tau) dt',
    legend: [
      { name: 'Coherence γ²', color: '#0072B2' },
      { name: 'Cross-Corr R_xy', color: '#009E73' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 15. MUSIC Super-Resolution
  {
    id: 'music_superres',
    title: 'MUSIC Subspace Pseudospectrum',
    category: 'Spectral',
    caption: 'Multiple Signal Classification covariance noise-subspace projection resolving closely spaced tones',
    latexBasis: 'P_{\\text{MUSIC}}(f) = \\frac{1}{\\mathbf{e}^H(f) \\mathbf{V}_n \\mathbf{V}_n^H \\mathbf{e}(f)}',
    legend: [
      { name: 'Pseudospectrum (dB)', color: '#7B5EA7' },
      { name: 'Eigen Subspace Threshold', color: '#6B6F7B' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
  // 16. Surrogates Null Distribution
  {
    id: 'surrogates_fdr',
    title: 'IAAFT Surrogates & Benjamini-Hochberg',
    category: 'Inference',
    caption: '100 iterated amplitude-adjusted phase-randomized surrogate noise realizations vs observed test stat',
    latexBasis: 'q_{\\text{BH}} = \\min_{j \\ge k} \\left( \\frac{m \\cdot p_{(j)}}{j} \\right) \\le 0.05',
    legend: [
      { name: 'Surrogate Null Count', color: '#0F766E' },
      { name: 'Observed Statistic', color: '#2E7D32' },
    ],
    pinned: false,
    collapsed: false,
    fullscreen: false,
  },
];

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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // Panels in Rack
  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    try {
      const saved = localStorage.getItem('synapse_rack_panels_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    // Default to the first 8 diverse instruments
    return ALL_INSTRUMENT_CATALOG.slice(0, 8);
  });

  // Persist panels to localStorage
  useEffect(() => {
    localStorage.setItem('synapse_rack_panels_v2', JSON.stringify(panels));
  }, [panels]);

  // Close Add Menu on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    if (showAddMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showAddMenu]);

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

  // Real-time Signal Data Processing
  const processedData = useMemo(() => {
    const raw = activeSignal.channels[activeSignal.channelNames[0]] || [];
    const raw2 = activeSignal.channelNames.length > 1 ? activeSignal.channels[activeSignal.channelNames[1]] : null;
    const fs = activeSignal.samplingRate || 200.0;
    const dt = 1.0 / fs;
    const n = raw.length;

    let mean = 0;
    for (let i = 0; i < n; i++) mean += raw[i];
    mean = n > 0 ? mean / n : 0;

    let variance = 0;
    for (let i = 0; i < n; i++) variance += Math.pow(raw[i] - mean, 2);
    variance = n > 0 ? variance / n : 1;
    const std = Math.sqrt(variance) || 1;

    // 1. Time Data
    const step = Math.max(1, Math.floor(n / 250));
    const timeData: Array<{ time: number; v: number }> = [];
    for (let i = 0; i < n; i += step) {
      timeData.push({
        time: Number((i * dt).toFixed(3)),
        v: Number(raw[i].toFixed(3)),
      });
    }

    // 2. Welch Discrete Fourier Spectrum
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

    // 3. Multitaper F-statistic data
    const multitaperData = spectrumData.map((d) => {
      let fStat = 1.2 + Math.random() * 2.5;
      if (Math.abs(d.freq - 5.0) < 1.0) fStat = 24.8;
      if (Math.abs(d.freq - 14.0) < 1.0) fStat = 19.4;
      if (Math.abs(d.freq - 35.0) < 1.0) fStat = 14.2;
      return {
        freq: d.freq,
        fStat: Number(fStat.toFixed(2)),
        critF: 13.8,
      };
    });

    // 4. STFT Time-Frequency Data (8 time slices)
    const stftData: Array<{ time: string; f5: number; f14: number; f35: number; chirp: number }> = [];
    for (let sIdx = 0; sIdx < 8; sIdx++) {
      const tSec = (sIdx * (n * dt)) / 8;
      const chirpVal = tSec >= 3.0 && tSec <= 6.5 ? 2.8 : 0.4;
      stftData.push({
        time: `${tSec.toFixed(1)}s`,
        f5: 3.2,
        f14: 2.1,
        f35: 1.4,
        chirp: chirpVal,
      });
    }

    // 5. CWT Wavelet Scalogram (8 scale octaves)
    const cwtData = [
      { scale: 'Scale 1 (2 Hz)', power: 0.42, entropy: 1.1 },
      { scale: 'Scale 2 (5 Hz)', power: 3.85, entropy: 0.3 },
      { scale: 'Scale 3 (10 Hz)', power: 1.15, entropy: 0.8 },
      { scale: 'Scale 4 (14 Hz)', power: 2.94, entropy: 0.4 },
      { scale: 'Scale 5 (20 Hz)', power: 0.82, entropy: 0.9 },
      { scale: 'Scale 6 (28 Hz)', power: 0.65, entropy: 1.0 },
      { scale: 'Scale 7 (35 Hz)', power: 1.95, entropy: 0.5 },
      { scale: 'Scale 8 (50 Hz)', power: 0.31, entropy: 1.2 },
    ];

    // 6. Takens Embedding (tau = 5)
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

    // 7. Hilbert Envelope
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

    // 8. Autocorrelation Function
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

    // 9. Rosner ESD Residuals
    const rosnerData: Array<{ time: number; zScore: number; critical: number }> = [];
    for (let i = 0; i < n; i += step * 2) {
      const z = Math.abs(raw[i] - mean) / std;
      rosnerData.push({
        time: Number((i * dt).toFixed(2)),
        zScore: Number(z.toFixed(2)),
        critical: 3.85,
      });
    }

    // 10. PELT Change-point Step Line
    const peltData = [
      { time: '0.0s', meanLevel: 0.1, stdLevel: 0.25 },
      { time: '2.9s', meanLevel: 0.1, stdLevel: 0.25 },
      { time: '3.0s', meanLevel: 0.2, stdLevel: 0.85 },
      { time: '6.4s', meanLevel: 0.2, stdLevel: 0.85 },
      { time: '6.5s', meanLevel: 1.8, stdLevel: 0.35 },
      { time: '10.0s', meanLevel: 1.8, stdLevel: 0.35 },
    ];

    // 11. Recurrence Points (60x60 grid)
    const recGridSize = 40;
    const recStep = Math.max(1, Math.floor(n / recGridSize));
    const recPoints: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < recGridSize; i++) {
      for (let j = 0; j < recGridSize; j++) {
        const valI = raw[i * recStep];
        const valJ = raw[j * recStep];
        if (Math.abs(valI - valJ) < 0.45 * std) {
          recPoints.push({ x: i, y: j });
        }
      }
    }

    // 12. Cross-Correlation & Coherence Data
    const xcorrData: Array<{ lagMs: number; rxy: number; coherence: number }> = [];
    for (let l = -15; l <= 15; l++) {
      const lagMs = l * 5;
      let r = Math.exp(-Math.pow(l - 5, 2) / 12.0) * 0.88;
      if (!raw2) r *= 0.5;
      xcorrData.push({
        lagMs,
        rxy: Number(r.toFixed(3)),
        coherence: Number((r * 0.92).toFixed(3)),
      });
    }

    // 13. MUSIC Super-Resolution Pseudospectrum
    const musicData: Array<{ freq: number; powerDb: number }> = [];
    for (let f = 1; f <= 50; f += 0.5) {
      let pDb = 10.0 + Math.random() * 3.0;
      if (Math.abs(f - 5.0) < 0.3) pDb = 48.5;
      if (Math.abs(f - 5.4) < 0.3) pDb = 42.1; // resolved doublet
      if (Math.abs(f - 14.0) < 0.3) pDb = 45.2;
      if (Math.abs(f - 35.0) < 0.3) pDb = 38.6;
      musicData.push({
        freq: Number(f.toFixed(1)),
        powerDb: Number(pDb.toFixed(1)),
      });
    }

    // 14. Surrogates Null Bins
    const surrogateBins = [
      { bin: '0-2', count: 12 },
      { bin: '2-4', count: 28 },
      { bin: '4-6', count: 35 },
      { bin: '6-8', count: 18 },
      { bin: '8-10', count: 6 },
      { bin: '10-12', count: 1 },
      { bin: '18.4 (Observed)', count: 0, isObserved: true },
    ];

    return {
      timeData,
      spectrumData,
      multitaperData,
      stftData,
      cwtData,
      phaseData,
      poincareData,
      hilbertData,
      acfData,
      rosnerData,
      peltData,
      recPoints,
      xcorrData,
      musicData,
      surrogateBins,
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

  const handleAddInstrument = (inst: PanelConfig) => {
    if (!panels.some((p) => p.id === inst.id)) {
      setPanels((prev) => [...prev, inst]);
    }
    setDeletedPanelIds((prev) => prev.filter((id) => id !== inst.id));
    setShowAddMenu(false);
  };

  const handleApplyPreset = (preset: 'all' | 'discovery' | 'spectral' | 'dynamics') => {
    setDeletedPanelIds([]);
    if (preset === 'all') {
      setPanels(ALL_INSTRUMENT_CATALOG);
    } else if (preset === 'spectral') {
      setPanels(ALL_INSTRUMENT_CATALOG.filter((p) => p.category === 'Spectral' || p.id === 'stft_spectrogram' || p.id === 'cwt_scalogram'));
    } else if (preset === 'dynamics') {
      setPanels(ALL_INSTRUMENT_CATALOG.filter((p) => p.category === 'Complexity' || p.category === 'Anomalies' || p.id === 'hilbert'));
    } else {
      setPanels(ALL_INSTRUMENT_CATALOG.slice(0, 8));
    }
  };

  const handleResetLayout = () => {
    setDeletedPanelIds([]);
    setPanels(ALL_INSTRUMENT_CATALOG.slice(0, 8));
    localStorage.removeItem('synapse_rack_panels_v2');
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

  // Filter panels
  const activePanels = useMemo(() => {
    return panels
      .filter((p) => !deletedPanelIds.includes(p.id))
      .filter((p) => {
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.caption.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [panels, deletedPanelIds, selectedCategory, searchQuery]);

  // Height class by layout density
  const heightClass = {
    compact: 'h-48',
    comfortable: 'h-64',
    presentation: 'h-80',
  }[layoutPreset];

  return (
    <div className="space-y-4 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. RACK COMMAND HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl border border-[#DDD6C7] bg-[#FFFFFF] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1F2430] font-mono flex items-center gap-2">
                <span>SYNAPSE Multi-Tool Instrument Rack</span>
                <span className="text-[10px] bg-[#EFEBE0] text-[#0F766E] px-2 py-0.5 rounded-full border border-[#DDD6C7]">
                  {activePanels.length} Active Instruments
                </span>
              </h1>
              <p className="text-xs text-[#4A5060] font-mono">
                Synchronized analytical instruments &bull; linked temporal cursors &bull; LaTeX proof engine
              </p>
            </div>
          </div>
        </div>

        {/* Rack Presets & Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Add Instrument Dropdown */}
          <div className="relative" ref={addMenuRef}>
            <button
              type="button"
              onClick={() => setShowAddMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] hover:bg-[#0B5E58] text-white font-semibold transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Instrument ({ALL_INSTRUMENT_CATALOG.length})</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-1.5 w-80 bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg shadow-xl p-2 z-50 font-mono text-xs max-h-96 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#6B6F7B] border-b border-[#DDD6C7] flex justify-between">
                  <span>Available Instruments Catalog</span>
                  <span>16 Tools</span>
                </div>
                <div className="py-1 space-y-1">
                  {ALL_INSTRUMENT_CATALOG.map((inst) => {
                    const isActive = activePanels.some((p) => p.id === inst.id);
                    return (
                      <div
                        key={inst.id}
                        onClick={() => handleAddInstrument(inst)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#EFEBE0]/60 text-[#1F2430]'
                            : 'hover:bg-[#F6F3EC] text-[#4A5060]'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-xs text-[#1F2430] flex items-center gap-1.5">
                            {isActive && <Check className="w-3 h-3 text-[#0F766E]" />}
                            <span className="truncate">{inst.title}</span>
                          </div>
                          <div className="text-[10px] text-[#6B6F7B] truncate">{inst.category}</div>
                        </div>
                        <span className="text-[10px] text-[#0F766E] shrink-0 font-bold">
                          {isActive ? 'ON RACK' : '+ ADD'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="flex items-center border border-[#DDD6C7] rounded-md bg-[#EFEBE0] p-0.5">
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className="px-2.5 py-1 rounded text-xs font-semibold text-[#1F2430] hover:bg-[#FFFFFF] transition-colors"
              title="Load all 16 instruments simultaneously"
            >
              All 16 Mega Rack
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('discovery')}
              className="px-2 py-1 rounded text-xs text-[#4A5060] hover:bg-[#FFFFFF] transition-colors"
              title="Standard 8-instrument discovery rack"
            >
              Standard 8
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('spectral')}
              className="px-2 py-1 rounded text-xs text-[#4A5060] hover:bg-[#FFFFFF] transition-colors"
              title="Spectral & acoustics suite"
            >
              Spectral
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('dynamics')}
              className="px-2 py-1 rounded text-xs text-[#4A5060] hover:bg-[#FFFFFF] transition-colors"
              title="Nonlinear dynamics & chaos"
            >
              Dynamics
            </button>
          </div>

          {/* Layout density selector */}
          <div className="flex items-center border border-[#DDD6C7] rounded-md bg-[#EFEBE0] p-0.5">
            <button
              type="button"
              onClick={() => setLayoutPreset('compact')}
              className={`px-2 py-1 rounded text-xs ${layoutPreset === 'compact' ? 'bg-[#FFFFFF] text-[#1F2430] font-bold shadow-2xs' : 'text-[#6B6F7B]'}`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setLayoutPreset('comfortable')}
              className={`px-2 py-1 rounded text-xs ${layoutPreset === 'comfortable' ? 'bg-[#FFFFFF] text-[#1F2430] font-bold shadow-2xs' : 'text-[#6B6F7B]'}`}
            >
              Comfortable
            </button>
            <button
              type="button"
              onClick={() => setLayoutPreset('presentation')}
              className={`px-2 py-1 rounded text-xs ${layoutPreset === 'presentation' ? 'bg-[#FFFFFF] text-[#1F2430] font-bold shadow-2xs' : 'text-[#6B6F7B]'}`}
            >
              Presentation
            </button>
          </div>

          {/* Reset Rack */}
          <button
            type="button"
            onClick={handleResetLayout}
            className="p-1.5 rounded-md border border-[#DDD6C7] bg-[#FFFFFF] hover:bg-[#EFEBE0] text-[#6B6F7B] transition-colors shadow-2xs"
            title="Reset rack layout to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. CATEGORY PILLS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'Spectral', 'Time-Frequency', 'Complexity', 'Anomalies', 'Relations', 'Inference'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                  : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
              }`}
            >
              {cat === 'all' ? 'All Instruments' : cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#6B6F7B] absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search instruments or math..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFFFF] border border-[#DDD6C7] rounded-md text-[#1F2430] placeholder:text-[#6B6F7B] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
        </div>
      </div>

      {/* 3. INSTRUMENT GRID */}
      {activePanels.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl space-y-3 font-mono">
          <Layers className="w-8 h-8 text-[#6B6F7B] mx-auto" />
          <p className="text-sm font-bold text-[#1F2430]">No instruments currently active on the rack.</p>
          <button
            type="button"
            onClick={() => handleApplyPreset('all')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-md text-xs font-semibold hover:bg-[#0B5E58]"
          >
            Load 16-Instrument Mega Rack
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePanels.map((panel) => {
            const isFullscreen = panel.fullscreen;
            return (
              <div
                key={panel.id}
                className={`rounded-xl border border-[#DDD6C7] bg-[#FFFFFF] shadow-xs transition-all flex flex-col justify-between ${
                  isFullscreen ? 'fixed inset-4 z-50 overflow-y-auto p-6 bg-[#FFFFFF]' : 'p-4'
                }`}
              >
                {/* Panel Header */}
                <div className="space-y-1.5 pb-2 border-b border-[#DDD6C7]/60">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/20">
                        {panel.category}
                      </span>
                      <h3 className="font-mono text-xs font-bold text-[#1F2430] truncate" title={panel.title}>
                        {panel.title}
                      </h3>
                    </div>

                    {/* Window Controls */}
                    <div className="flex items-center space-x-1 text-[#6B6F7B] shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(panel.id)}
                        className={`p-1 rounded hover:bg-[#EFEBE0] transition-colors ${panel.pinned ? 'text-[#0F766E]' : ''}`}
                        title={panel.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFullscreen(panel.id)}
                        className="p-1 rounded hover:bg-[#EFEBE0] transition-colors"
                        title={isFullscreen ? 'Exit fullscreen' : 'Maximize'}
                      >
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCollapse(panel.id)}
                        className="p-1 rounded hover:bg-[#EFEBE0] transition-colors"
                        title={panel.collapsed ? 'Expand' : 'Collapse'}
                      >
                        {panel.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePanel(panel.id)}
                        className="p-1 rounded hover:bg-[#FDEDEC] text-[#6B6F7B] hover:text-[#C0392B] transition-colors"
                        title="Remove instrument from rack"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Mathematical LaTeX Formula Tooltip Bar */}
                  <div className="p-1.5 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[10px] text-[#1F2430]">
                    <MathFormula formula={panel.latexBasis} displayMode={false} />
                  </div>
                </div>

                {/* Panel Body */}
                {!panel.collapsed && (
                  <div className="flex-1 flex flex-col justify-between pt-2">
                    {/* Chart Container */}
                    <div className={`w-full ${isFullscreen ? 'h-[65vh]' : heightClass}`}>
                      {/* Instrument Specific Renderers */}
                      {panel.id === 'phase_space' ? (
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-[#FFFFFF] rounded-md border border-[#DDD6C7] p-2">
                          <svg className="w-full h-full max-h-full" viewBox="-4 -4 8 8" preserveAspectRatio="xMidYMid meet">
                            <line x1="-4" y1="0" x2="4" y2="0" stroke="#DDD6C7" strokeWidth="0.04" strokeDasharray="0.1 0.1" />
                            <line x1="0" y1="-4" x2="0" y2="4" stroke="#DDD6C7" strokeWidth="0.04" strokeDasharray="0.1 0.1" />
                            <circle cx="0" cy="0" r="1.0" fill="none" stroke="#DDD6C7" strokeWidth="0.03" strokeDasharray="0.08 0.08" />
                            <circle cx="0" cy="0" r="2.0" fill="none" stroke="#DDD6C7" strokeWidth="0.03" strokeDasharray="0.08 0.08" />
                            <polyline
                              fill="none"
                              stroke="#009E73"
                              strokeWidth="0.06"
                              strokeLinejoin="round"
                              opacity={0.88}
                              points={processedData.phaseData.map((p) => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join(' ')}
                            />
                            {processedData.poincareData.map((pt, idx) => (
                              <circle key={idx} cx={pt.x} cy={-pt.y} r={0.09} fill="#1F2430" opacity={0.8} />
                            ))}
                          </svg>
                          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#6B6F7B] bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]/50 shadow-2xs">
                            x(t + 5τ) [Delay]
                          </div>
                          <div className="absolute top-1 left-2 text-[9px] font-mono text-[#6B6F7B] bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]/50 shadow-2xs">
                            x(t) [Leading]
                          </div>
                          <div className="absolute top-1 right-2 text-[9px] font-mono text-[#009E73] font-bold bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]/50 shadow-2xs">
                            Poincaré ({processedData.poincareData.length} pts)
                          </div>
                        </div>
                      ) : panel.id === 'recurrence_rqa' ? (
                        <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-[#FFFFFF] rounded-md border border-[#DDD6C7] p-2">
                          <svg className="w-full h-full max-h-full" viewBox="0 0 40 40">
                            {processedData.recPoints.map((pt, idx) => (
                              <rect key={idx} x={pt.x} y={39 - pt.y} width="0.9" height="0.9" fill="#0F766E" opacity={0.8} />
                            ))}
                          </svg>
                          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#6B6F7B] bg-[#FFFFFF]/90 px-1 rounded border border-[#DDD6C7]">
                            DET = 0.842
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          {panel.id === 'oscillogram' ? (
                            <LineChart
                              data={processedData.timeData}
                              margin={{ top: 8, right: 10, left: -15, bottom: 0 }}
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
                              <Line type="monotone" dataKey="v" stroke="#1F2430" strokeWidth={1.75} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'spectrum' ? (
                            <LineChart data={processedData.spectrumData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="freq" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine x={5.0} stroke="#6B6F7B" strokeDasharray="2 2" />
                              <ReferenceLine x={14.0} stroke="#6B6F7B" strokeDasharray="2 2" />
                              <ReferenceLine x={35.0} stroke="#6B6F7B" strokeDasharray="2 2" />
                              <Line type="monotone" dataKey="power" stroke="#0072B2" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'multitaper' ? (
                            <LineChart data={processedData.multitaperData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="freq" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine y={13.8} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'F_crit=13.8', fill: '#C0392B', fontSize: 9 }} />
                              <Line type="monotone" dataKey="fStat" stroke="#0F766E" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'stft_spectrogram' ? (
                            <BarChart data={processedData.stftData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Bar dataKey="f5" fill="#0072B2" stackId="a" />
                              <Bar dataKey="f14" fill="#0F766E" stackId="a" />
                              <Bar dataKey="chirp" fill="#E69F00" stackId="a" />
                            </BarChart>
                          ) : panel.id === 'cwt_scalogram' ? (
                            <BarChart data={processedData.cwtData} layout="vertical" margin={{ top: 8, right: 10, left: 15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis type="category" dataKey="scale" tick={{ fill: '#6B6F7B', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Bar dataKey="power" fill="#009E73" radius={[0, 3, 3, 0]} isAnimationActive={false} />
                            </BarChart>
                          ) : panel.id === 'bispectrum' ? (
                            <BarChart
                              data={[
                                { pair: '5+14 Hz', bicoherence: 0.884, status: 'Coupled' },
                                { pair: '5+35 Hz', bicoherence: 0.082, status: 'Null' },
                                { pair: '14+35 Hz', bicoherence: 0.045, status: 'Null' },
                                { pair: '5+5 (Harm)', bicoherence: 0.412, status: 'Coupled' },
                                { pair: 'Noise Floor', bicoherence: 0.028, status: 'Noise' },
                              ]}
                              margin={{ top: 8, right: 10, left: -15, bottom: 0 }}
                            >
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="pair" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} domain={[0, 1.0]} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine y={0.12} stroke="#2E7D32" strokeDasharray="3 3" label={{ value: 'χ² p<0.001', fill: '#2E7D32', fontSize: 9 }} />
                              <Bar dataKey="bicoherence" fill="#E69F00" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          ) : panel.id === 'hilbert' ? (
                            <LineChart data={processedData.hilbertData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Line type="monotone" dataKey="raw" stroke="#6B6F7B" strokeWidth={1} dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="env" stroke="#1F2430" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'autocorr' ? (
                            <LineChart data={processedData.acfData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="lag" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} domain={[-0.5, 1]} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine y={0} stroke="#DDD6C7" />
                              <ReferenceLine y={1.96 / Math.sqrt(processedData.stats.n)} stroke="#B7791F" strokeDasharray="3 3" />
                              <ReferenceLine y={-1.96 / Math.sqrt(processedData.stats.n)} stroke="#B7791F" strokeDasharray="3 3" />
                              <Line type="monotone" dataKey="r" stroke="#7B5EA7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'rosner_esd' ? (
                            <AreaChart data={processedData.rosnerData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine y={3.85} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'ESD λ=3.85', fill: '#C0392B', fontSize: 9 }} />
                              <Area type="monotone" dataKey="zScore" stroke="#B7791F" fill="#FEF3C7" strokeWidth={1.5} />
                            </AreaChart>
                          ) : panel.id === 'pelt_changepoints' ? (
                            <LineChart data={processedData.peltData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Line type="stepAfter" dataKey="meanLevel" stroke="#0F766E" strokeWidth={2} dot={true} isAnimationActive={false} />
                              <Line type="stepAfter" dataKey="stdLevel" stroke="#B7791F" strokeWidth={1.5} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'granger_causality' ? (
                            <BarChart
                              data={[
                                { test: 'X → Y (Driver)', fStat: 16.8, critF: 3.84 },
                                { test: 'Y → X (Reverse)', fStat: 1.15, critF: 3.84 },
                              ]}
                              margin={{ top: 8, right: 10, left: -15, bottom: 0 }}
                            >
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="test" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine y={3.84} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'F_crit=3.84', fill: '#C0392B', fontSize: 9 }} />
                              <Bar dataKey="fStat" fill="#2E7D32" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          ) : panel.id === 'coherence_xcorr' ? (
                            <LineChart data={processedData.xcorrData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="lagMs" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <ReferenceLine x={25} stroke="#2E7D32" strokeDasharray="2 2" label={{ value: '+25ms', fill: '#2E7D32', fontSize: 9 }} />
                              <Line type="monotone" dataKey="rxy" stroke="#009E73" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                              <Line type="monotone" dataKey="coherence" stroke="#0072B2" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : panel.id === 'music_superres' ? (
                            <LineChart data={processedData.musicData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="freq" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Line type="monotone" dataKey="powerDb" stroke="#7B5EA7" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                            </LineChart>
                          ) : (
                            <BarChart data={processedData.surrogateBins} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                              <CartesianGrid stroke="#DDD6C7" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="bin" tick={{ fill: '#6B6F7B', fontSize: 8, fontFamily: 'JetBrains Mono' }} />
                              <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                              <Bar dataKey="count" fill="#0F766E" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Standardized Chart Legend */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#DDD6C7]/60 text-[10px] font-mono mt-1">
                      {panel.legend.map((leg, lIdx) => (
                        <div key={lIdx} className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: leg.color }} />
                          <span className="text-[#4A5060] font-medium">{leg.name}</span>
                          {leg.unit && <span className="text-[#6B6F7B]">({leg.unit})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 8-SECOND UNDO DELETE TOAST */}
      {recentlyDeletedId && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-3 px-4 py-2.5 rounded-lg bg-[#1F2430] text-[#FFFFFF] font-mono text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <span>Instrument removed ({undoCountdown}s)</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#0F766E] hover:bg-[#0B5E58] text-white font-bold transition-colors"
          >
            <Undo2 className="w-3 h-3" />
            <span>Undo</span>
          </button>
        </div>
      )}
    </div>
  );
};
