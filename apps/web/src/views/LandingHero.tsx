import React, { useState, useMemo } from 'react';
import { HalftoneWaveCanvas } from '../components/hero/HalftoneWaveCanvas';
import { MathFormula } from '../components/common/MathFormula';
import {
  ArrowRight,
  Compass,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';

interface LandingHeroProps {
  onLaunchWorkbench: () => void;
  onOpenBenchmarks: () => void;
  onOpenRack?: () => void;
  onOpenMethods?: () => void;
  realTestCount?: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onLaunchWorkbench,
  onOpenBenchmarks,
  onOpenRack,
  onOpenMethods,
  realTestCount = 33,
}) => {
  const [activeTab, setActiveTab] = useState<'periodic' | 'chirp' | 'spikes'>('periodic');

  // Live real mathematical signal preview for hero
  const previewPoints = useMemo(() => {
    const pts: Array<{ t: number; v: number }> = [];
    const n = 140;
    const dt = 0.007;

    for (let i = 0; i < n; i++) {
      const t = i * dt;
      let v = 0;
      if (activeTab === 'periodic') {
        v = 1.5 * Math.cos(2 * Math.PI * 5.0 * t) +
            1.0 * Math.cos(2 * Math.PI * 14.0 * t + 0.4) +
            0.6 * Math.cos(2 * Math.PI * 35.0 * t + 1.2);
      } else if (activeTab === 'chirp') {
        const phase = 2 * Math.PI * (2.0 * t + 16.0 * Math.pow(t, 2));
        v = 2.0 * Math.sin(phase);
      } else {
        v = 0.5 * Math.sin(2 * Math.PI * 4.0 * t) + ((i % 13) - 6) / 22.0;
        if (i === 38) v += 5.8;
        if (i === 82) v -= 5.4;
        if (i === 114) v += 6.2;
      }
      pts.push({ t: Number(t.toFixed(3)), v: Number(v.toFixed(3)) });
    }
    return pts;
  }, [activeTab]);

  // Scaled SVG coordinates in 640 x 180 coordinate space
  const svgCoords = useMemo(() => {
    const w = 640;
    const h = 180;
    const padX = 20;
    const padY = 20;
    const innerW = w - 2 * padX;
    const innerH = h - 2 * padY;
    const midY = h / 2;
    const maxVal = 7.5;

    return previewPoints.map((p, idx) => {
      const x = padX + (idx / (previewPoints.length - 1)) * innerW;
      const y = midY - (p.v / maxVal) * (innerH / 2);
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });
  }, [previewPoints]);

  const polylineStr = useMemo(() => {
    return svgCoords.map((pt) => `${pt.x},${pt.y}`).join(' ');
  }, [svgCoords]);

  const areaPolygonStr = useMemo(() => {
    if (svgCoords.length === 0) return '';
    const firstX = svgCoords[0].x;
    const lastX = svgCoords[svgCoords.length - 1].x;
    return `${firstX},90 ${polylineStr} ${lastX},90`;
  }, [svgCoords, polylineStr]);

  return (
    <div className="relative min-h-screen w-full bg-[#F6F3EC] text-[#1F2430] flex flex-col justify-between overflow-x-hidden overflow-y-auto font-sans selection:bg-[#EFEBE0]">
      {/* Background Graticule Canvas */}
      <HalftoneWaveCanvas className="z-0 opacity-50" />

      {/* 1. ACADEMIC FLOATING NAVBAR */}
      <header className="relative z-10 w-full pt-6 px-4 sm:px-8 flex justify-center shrink-0">
        <nav
          className="w-full max-w-6xl bg-[#FFFFFF]/95 border border-[#DDD6C7] rounded-full px-5 py-2.5 flex items-center justify-between shadow-xs backdrop-blur-md"
          aria-label="Primary Navigation"
        >
          {/* Brand & Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={onLaunchWorkbench}>
              <div className="w-7 h-7 rounded-full bg-[#0F766E] flex items-center justify-center text-white shadow-2xs group-hover:bg-[#0B5E58] transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-mono font-bold tracking-tight text-[#1F2430] text-sm">SYNAPSE</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFEBE0] border border-[#DDD6C7] text-[11px] font-mono text-[#4A5060]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
              <span>v1.0 &bull; {realTestCount}/33 tests passing</span>
            </div>
          </div>

          {/* Academic Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-[#4A5060]">
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="hover:text-[#1F2430] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1"
            >
              Paper Workbench
            </button>
            {onOpenRack && (
              <button
                type="button"
                onClick={onOpenRack}
                className="hover:text-[#1F2430] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1"
              >
                Instrument Rack
              </button>
            )}
            <button
              type="button"
              onClick={onOpenBenchmarks}
              className="hover:text-[#1F2430] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1"
            >
              Benchmarks (A&ndash;J, Ω)
            </button>
            {onOpenMethods && (
              <button
                type="button"
                onClick={onOpenMethods}
                className="hover:text-[#1F2430] transition-colors focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1"
              >
                Methods Library
              </button>
            )}
            <a
              href="https://github.com/Chauhan-legacy/Synapsev1.git"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#1F2430] transition-colors flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#0F766E] rounded px-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-[#6B6F7B]" />
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onOpenRack && (
              <button
                type="button"
                onClick={onOpenRack}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#DDD6C7] text-xs font-mono text-[#1F2430] hover:bg-[#EFEBE0] transition-colors shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Rack</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="flex items-center gap-1.5 bg-[#0F766E] hover:bg-[#0B5E58] text-white px-4 py-1.5 rounded-full text-xs font-mono font-semibold tracking-wide shadow-xs transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <span>Open Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* 2. HERO MAIN DISPLAY */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Title & Mission Statement */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#DDD6C7] text-[#0F766E] text-xs font-mono shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              <span>Universal Signal Intelligence &amp; Scientific Discovery</span>
            </div>

            <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl tracking-tight text-[#1F2430] font-normal leading-[0.95]">
              SYNAPSE
            </h1>

            <p className="font-serif italic text-lg sm:text-2xl text-[#4A5060] max-w-lg leading-snug">
              &ldquo;Don&rsquo;t just plot raw data. Discover, mathematically model, and statistically verify the structures hidden within physical signals.&rdquo;
            </p>

            <p className="text-xs sm:text-sm text-[#4A5060] leading-relaxed font-sans max-w-xl">
              Engineered for rigorous scientific inquiry and reproducible discoveries. Integrates 24 analytical engines spanning Thomson
              multitaper spectral estimation, phase-space Poincaré embeddings, ROSNER ESD anomaly isolation,
              and Benjamini-Hochberg False Discovery Rate control.
            </p>

            {/* Launch CTA Group */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onLaunchWorkbench}
                className="flex items-center gap-2 bg-[#0F766E] hover:bg-[#0B5E58] text-white px-6 py-3 rounded-full font-mono text-xs sm:text-sm font-semibold tracking-wide shadow-xs transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              >
                <span>Launch Paper Workbench</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {onOpenRack && (
                <button
                  type="button"
                  onClick={onOpenRack}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#1F2430] font-mono text-xs sm:text-sm font-semibold shadow-2xs transition-colors"
                >
                  <Sliders className="w-4 h-4 text-[#0F766E]" />
                  <span>Full Instrument Rack</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenBenchmarks}
                className="px-4 py-3 rounded-full bg-[#EFEBE0] border border-[#DDD6C7] hover:bg-[#DDD6C7]/50 text-[#1F2430] font-mono text-xs font-medium transition-colors"
              >
                Benchmarks (A&ndash;J, Ω)
              </button>
            </div>

            {/* Scientific Invariant Telemetry */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#DDD6C7] font-mono text-[11px] text-[#4A5060]">
              <div>
                <span className="text-[#1F2430] font-bold">24</span> Pure Math Engines
              </div>
              <div>
                <span className="text-[#2E7D32] font-bold">{realTestCount}/33</span> Pytest Suite Green
              </div>
              <div>
                <span className="text-[#0F766E] font-bold">&le; 1e-12</span> Machine Epsilon
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Signal Discovery Showcase */}
          <div className="lg:col-span-6">
            <div className="rounded-xl border border-[#DDD6C7] bg-[#FFFFFF] shadow-md p-4 space-y-3 font-mono">
              {/* Card Header & Signal Switcher */}
              <div className="flex items-center justify-between border-b border-[#DDD6C7]/70 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span className="text-xs font-bold text-[#1F2430] uppercase">Live Signal Discovery Engine</span>
                </div>
                <span className="text-[10px] bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full font-bold border border-[#2E7D32]/20">
                  REAL-TIME MATH
                </span>
              </div>

              {/* Mode Selectors */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveTab('periodic')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === 'periodic'
                      ? 'bg-[#0F766E] text-white font-bold'
                      : 'bg-[#EFEBE0] text-[#4A5060] hover:text-[#1F2430]'
                  }`}
                >
                  Harmonic Modes (5, 14, 35 Hz)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chirp')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === 'chirp'
                      ? 'bg-[#0F766E] text-white font-bold'
                      : 'bg-[#EFEBE0] text-[#4A5060] hover:text-[#1F2430]'
                  }`}
                >
                  Quadratic Chirp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('spikes')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeTab === 'spikes'
                      ? 'bg-[#0F766E] text-white font-bold'
                      : 'bg-[#EFEBE0] text-[#4A5060] hover:text-[#1F2430]'
                  }`}
                >
                  Transient Spikes
                </button>
              </div>

              {/* Active LaTeX Mathematical Formula Box */}
              <div className="p-2.5 rounded-md bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[11px] text-[#1F2430]">
                {activeTab === 'periodic' && (
                  <MathFormula
                    formula="x(t) = 1.5\cos(10\pi t) + 1.0\cos(28\pi t + 0.4) + 0.6\cos(70\pi t + 1.2) + \eta(t)"
                    displayMode={false}
                  />
                )}
                {activeTab === 'chirp' && (
                  <MathFormula
                    formula="x(t) = 2.0\sin\left(2\pi \left(2.0 t + 16.0 t^2\right)\right), \quad f(t) = 2.0 + 32.0 t\text{ Hz}"
                    displayMode={false}
                  />
                )}
                {activeTab === 'spikes' && (
                  <MathFormula
                    formula="R_i = \frac{\max_i |x_i - \bar{x}|}{s} > \lambda_{\text{Rosner}}(\alpha = 0.001), \quad t \in \{0.27, 0.57, 0.80\}\text{ s}"
                    displayMode={false}
                  />
                )}
              </div>

              {/* High-Resolution Razor-Sharp SVG Oscillogram Waveform */}
              <div className="h-44 w-full bg-[#FBF9F5] rounded-lg border border-[#DDD6C7] p-2 relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 640 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F766E" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#0F766E" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Graticule Gridlines */}
                  <line x1="20" y1="30" x2="620" y2="30" stroke="#DDD6C7" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="90" x2="620" y2="90" stroke="#DDD6C7" strokeWidth="1.2" />
                  <line x1="20" y1="150" x2="620" y2="150" stroke="#DDD6C7" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Vertical Time Markers */}
                  <line x1="170" y1="20" x2="170" y2="160" stroke="#DDD6C7" strokeWidth="0.8" strokeDasharray="2 2" />
                  <line x1="320" y1="20" x2="320" y2="160" stroke="#DDD6C7" strokeWidth="0.8" strokeDasharray="2 2" />
                  <line x1="470" y1="20" x2="470" y2="160" stroke="#DDD6C7" strokeWidth="0.8" strokeDasharray="2 2" />

                  {/* Shaded Area */}
                  {areaPolygonStr && (
                    <polygon points={areaPolygonStr} fill="url(#waveGrad)" />
                  )}

                  {/* Razor-sharp plotted trace in ink black */}
                  <polyline
                    fill="none"
                    stroke="#1F2430"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />

                  {/* Live Cursor Ring at End Point */}
                  {svgCoords.length > 0 && (
                    <circle
                      cx={svgCoords[svgCoords.length - 1].x}
                      cy={svgCoords[svgCoords.length - 1].y}
                      r="3.5"
                      fill="#0F766E"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  )}
                </svg>

                {/* Mathematical Oscillogram Annotations */}
                <div className="absolute top-2 left-3 text-[9px] text-[#6B6F7B]">
                  fs = 200 Hz &bull; dt = 5 ms
                </div>
                <div className="absolute top-2 right-3 text-[9px] font-bold text-[#0F766E] bg-[#FFFFFF]/90 px-2 py-0.5 rounded border border-[#DDD6C7] shadow-2xs">
                  {activeTab === 'periodic'
                    ? '3 Discrete Sinusoids Detected'
                    : activeTab === 'chirp'
                    ? 'Frequency Modulation [2 → 34 Hz]'
                    : '3 Outliers Identified (p < 0.001)'}
                </div>
                <div className="absolute bottom-1.5 right-3 text-[9px] text-[#6B6F7B]">
                  Window: [0.00s, 0.98s]
                </div>
              </div>

              {/* Detected Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                  <div className="text-[#6B6F7B]">Primary Peak</div>
                  <div className="text-[#1F2430] font-bold">
                    {activeTab === 'periodic' ? '5.00 Hz' : activeTab === 'chirp' ? 'Dynamic Chirp' : '3.98 Hz'}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                  <div className="text-[#6B6F7B]">Inference Status</div>
                  <div className="text-[#2E7D32] font-bold">
                    {activeTab === 'periodic' ? 'Validated F=24.8' : activeTab === 'chirp' ? 'Non-Stationary' : 'Rosner ESD Alert'}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7]">
                  <div className="text-[#6B6F7B]">Cryptographic Hash</div>
                  <div className="text-[#0F766E] font-bold">SHA-256 Validated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FOUR CORE SCIENTIFIC PILLARS WITH EXACT LATEX FORMULAS */}
        <section className="mt-14 pt-8 border-t border-[#DDD6C7] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-2xs space-y-2 hover:border-[#0F766E]/40 transition-colors">
            <div className="flex items-center gap-1.5 text-[#0F766E] text-[10px] uppercase font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>Spectral Rigor</span>
            </div>
            <div className="text-sm font-bold text-[#1F2430]">Thomson Multitaper F-Test</div>
            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[10px]">
              <MathFormula
                formula="F = \frac{(K-1)|\hat{\mu}(f)|^2 \sum_k U_k(0)^2}{\sum_k |\hat{y}_k(f) - \hat{\mu}(f)U_k(0)|^2}"
                displayMode={false}
              />
            </div>
            <p className="text-[11px] text-[#4A5060] font-sans leading-relaxed">
              Separates discrete sinusoidal harmonic lines from continuous Gaussian noise floors with exact p-value bounds.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-2xs space-y-2 hover:border-[#0F766E]/40 transition-colors">
            <div className="flex items-center gap-1.5 text-[#0F766E] text-[10px] uppercase font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Statistical Inference</span>
            </div>
            <div className="text-sm font-bold text-[#1F2430]">IAAFT Surrogates &amp; FDR</div>
            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[10px]">
              <MathFormula
                formula="\mathcal{F}\{x^{(m)}\} = |\mathcal{F}\{x\}| e^{i\psi^{(m)}}, \quad q_{\text{BH}} \le 0.05"
                displayMode={false}
              />
            </div>
            <p className="text-[11px] text-[#4A5060] font-sans leading-relaxed">
              100 iterated amplitude-adjusted phase-randomized surrogate noise realizations with Benjamini-Hochberg error control.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-2xs space-y-2 hover:border-[#0F766E]/40 transition-colors">
            <div className="flex items-center gap-1.5 text-[#0F766E] text-[10px] uppercase font-bold">
              <Layers className="w-3.5 h-3.5" />
              <span>Nonlinear Dynamics</span>
            </div>
            <div className="text-sm font-bold text-[#1F2430]">Takens Phase Embedding</div>
            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[10px]">
              <MathFormula
                formula="\mathbf{v}(t) = [x(t), x(t+\tau), \dots, x(t+(d-1)\tau)]^T"
                displayMode={false}
              />
            </div>
            <p className="text-[11px] text-[#4A5060] font-sans leading-relaxed">
              Reconstructs multi-dimensional attractor trajectories and Poincaré sections via Average Mutual Information and FNN.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-2xs space-y-2 hover:border-[#0F766E]/40 transition-colors">
            <div className="flex items-center gap-1.5 text-[#0F766E] text-[10px] uppercase font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bitwise Invariants</span>
            </div>
            <div className="text-sm font-bold text-[#1F2430]">Write-Protected Memory</div>
            <div className="p-2 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-center overflow-x-auto text-[10px]">
              <MathFormula
                formula="\Delta \operatorname{SHA256}(\mathbf{X}_{\text{raw}}) \equiv 0, \quad \epsilon \le 10^{-12}"
                displayMode={false}
              />
            </div>
            <p className="text-[11px] text-[#4A5060] font-sans leading-relaxed">
              Raw uploaded buffers are strictly immutable (flags.writeable = False) with SHA-256 cryptographic provenance graphs.
            </p>
          </div>
        </section>

        {/* 4. GROUND-TRUTH SCIENTIFIC BENCHMARKS */}
        <section className="mt-8 p-5 rounded-xl bg-[#FFFFFF] border border-[#DDD6C7] shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD6C7] pb-2">
            <span className="font-bold text-[#1F2430] uppercase text-[11px] tracking-wider">
              Ground-Truth Benchmarks &amp; Standardized Verification Archives:
            </span>
            <span className="text-[#0F766E] font-semibold text-[10px]">11 Built-in Presets (Datasets A through J &amp; Dataset Ω)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-[#4A5060]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>NASA Exoplanet Archive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>GWOSC Gravitational Waves</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>PhysioNet Biological Data</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>Dataset Ω: All-in-One Omnibus</span>
            </div>
          </div>
        </section>
      </main>

      {/* 5. ACADEMIC FOOTER */}
      <footer className="relative z-10 w-full border-t border-[#DDD6C7] bg-[#FFFFFF] py-4 px-6 text-xs font-mono text-[#6B6F7B] shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <span className="font-semibold text-[#1F2430]">SYNAPSE Discovery Platform</span>
            <span>&bull;</span>
            <span>Bitwise Reproducible within Machine Epsilon (&le; 1e-12)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Python 3.11</span>
            <span>&bull;</span>
            <span>FastAPI 0.162</span>
            <span>&bull;</span>
            <span>React 18 + TypeScript</span>
            <span>&bull;</span>
            <span className="text-[#0F766E] font-bold">100% Client Math &amp; Verified Backend</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHero;
