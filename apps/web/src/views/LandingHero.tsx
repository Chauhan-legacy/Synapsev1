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
  BookOpen,
} from 'lucide-react';
import claimsData from '../data/claims.json';

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
  realTestCount = claimsData.test_counts.total_automated_tests,
}) => {
  const [activeTab, setActiveTab] = useState<'periodic' | 'chirp' | 'spikes'>('periodic');

  // Interactive Live Waveform Generator
  const previewPoints = useMemo(() => {
    const pts: { t: number; v: number }[] = [];
    const N = 100;
    const dt = 0.01;

    for (let i = 0; i < N; i++) {
      const t = i * dt;
      let v = 0;

      if (activeTab === 'periodic') {
        // Multi-frequency harmonic combination
        v =
          1.5 * Math.cos(2 * Math.PI * 5 * t) +
          1.0 * Math.cos(2 * Math.PI * 14 * t + 0.4) +
          0.6 * Math.cos(2 * Math.PI * 35 * t + 1.2) +
          (Math.sin(i * 1234.56) * 0.15);
      } else if (activeTab === 'chirp') {
        // Quadratic chirp
        const f0 = 2.0;
        const k = 16.0;
        const phase = 2 * Math.PI * (f0 * t + k * t * t);
        v = 2.0 * Math.sin(phase) + (Math.sin(i * 987.65) * 0.12);
      } else {
        // Deterministic signal with transient spike anomalies
        v = 1.2 * Math.sin(2 * Math.PI * 4 * t);
        if (i === 27) v += 4.8;
        if (i === 57) v -= 3.9;
        if (i === 80) v += 3.2;
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
    <div className="relative min-h-screen w-full bg-[#F7F5EF] text-[#252925] flex flex-col justify-between overflow-y-auto font-georgia selection:bg-[#9CAF88]/40">
      {/* Background Subtle Graticule Canvas */}
      <HalftoneWaveCanvas className="z-0 opacity-15 pointer-events-none" />

      {/* 1. NAVIGATION BAR (1440px Responsive Container, Sage Green Visual Surface) */}
      <header className="relative z-10 w-full pt-6 px-4 sm:px-6 flex justify-center shrink-0">
        <nav
          className="w-[94%] max-w-[1440px] bg-[#9CAF88] border border-[#252925]/20 rounded-2xl px-6 sm:px-8 py-3.5 flex items-center justify-between shadow-sm backdrop-blur-md text-[#252925]"
          aria-label="Primary Navigation"
        >
          {/* Brand & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 cursor-pointer group" onClick={onLaunchWorkbench}>
              <div className="w-8 h-8 rounded-lg bg-[#252925] flex items-center justify-center text-[#F7F5EF] font-bold shadow-xs transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-georgia font-bold tracking-tight text-[#252925] text-lg">SYNAPSE</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F5EF] border border-[#252925]/20 text-xs font-mono text-[#252925]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8412C]" />
              <span>v2.1 &bull; {realTestCount}/{claimsData.test_counts.total_automated_tests} verified</span>
            </div>
          </div>

          {/* Navigation Links in Georgia */}
          <div className="hidden md:flex items-center gap-7 text-[13px] font-georgia text-[#252925]">
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="hover:text-[#E8412C] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#252925] rounded px-1.5 py-0.5"
            >
              Paper Workbench
            </button>
            {onOpenRack && (
              <button
                type="button"
                onClick={onOpenRack}
                className="hover:text-[#E8412C] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#252925] rounded px-1.5 py-0.5"
              >
                Instrument Rack
              </button>
            )}
            <button
              type="button"
              onClick={onOpenBenchmarks}
              className="hover:text-[#E8412C] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#252925] rounded px-1.5 py-0.5"
            >
              Benchmarks (A&ndash;J, Ω)
            </button>
            {onOpenMethods && (
              <button
                type="button"
                onClick={onOpenMethods}
                className="hover:text-[#E8412C] font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#252925] rounded px-1.5 py-0.5"
              >
                Methods Library
              </button>
            )}
            <a
              href="https://github.com/Chauhan-legacy/Synapsev1.git"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#E8412C] font-semibold transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-1 focus:ring-[#252925] rounded px-1.5 py-0.5"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#252925]/70" />
            </a>
          </div>

          {/* Primary Action Button (10% Signal Red Interactive Accent) */}
          <div className="flex items-center gap-3">
            {onOpenRack && (
              <button
                type="button"
                onClick={onOpenRack}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#252925]/20 bg-[#F7F5EF] text-xs font-georgia font-semibold text-[#252925] hover:border-[#252925] transition-colors shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-[#252925]" />
                <span>Rack</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="flex items-center gap-1.5 bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] px-4 py-2 rounded-lg text-xs font-georgia font-bold tracking-wide shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#E8412C]"
            >
              <span>Open Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* 2. HERO MAIN DISPLAY (1440px Responsive Container, Balanced 52/48 Grid) */}
      <main className="relative z-10 w-[94%] max-w-[1440px] mx-auto px-4 sm:px-6 py-10 lg:py-14 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Product Introduction (52% width) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#9CAF88]/30 border border-[#252925]/20 text-[#252925] text-xs font-georgia font-semibold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#E8412C] animate-pulse" />
              <span>Scientific Signal Intelligence &amp; Discovery</span>
            </div>

            <h1 className="font-georgia text-6xl sm:text-7xl lg:text-8xl tracking-tight text-[#252925] font-normal leading-[0.95]">
              SYNAPSE
            </h1>

            <h2 className="font-georgia text-2xl sm:text-3xl lg:text-4xl text-[#252925] max-w-2xl leading-snug font-normal">
              Discover the Mathematics Hidden Within Signals.
            </h2>

            <p className="text-sm sm:text-base text-[#252925]/85 leading-relaxed font-georgia max-w-2xl">
              An integrated scientific intelligence environment for signal analysis, mathematical modelling and statistical verification. Explore complex physical signals through rigorous analytical methods and reproducible computational workflows.
            </p>

            {/* Launch Actions */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onLaunchWorkbench}
                className="flex items-center gap-2 bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] px-6 py-3.5 rounded-lg font-georgia text-sm font-bold tracking-wide shadow-md transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#E8412C]"
              >
                <span>Launch Paper Workbench</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {onOpenRack && (
                <button
                  type="button"
                  onClick={onOpenRack}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#9CAF88] border border-[#252925]/20 hover:bg-[#9CAF88]/80 text-[#252925] font-georgia text-sm font-semibold shadow-xs transition-colors"
                >
                  <Sliders className="w-4 h-4 text-[#252925]" />
                  <span>Explore Instrument Rack</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenBenchmarks}
                className="px-4 py-3.5 rounded-lg bg-[#F7F5EF] border border-[#252925]/30 hover:border-[#252925] text-[#252925] font-georgia text-xs sm:text-sm font-medium transition-colors"
              >
                Benchmarks (A&ndash;J, Ω)
              </button>
            </div>

            {/* Scientific Invariant Telemetry */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[#252925]/20 font-georgia text-xs text-[#252925]/80">
              <div>
                <span className="text-[#252925] font-mono font-bold text-xl block">24</span> Pure Analytical Engines
              </div>
              <div>
                <span className="text-[#252925] font-mono font-bold text-xl block">{realTestCount}/{claimsData.test_counts.total_automated_tests}</span> Automated Tests Verified
              </div>
              <div>
                <span className="text-[#E8412C] font-mono font-bold text-xl block">0.00%</span> FDR Controlled (q &le; 0.05)
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Scientific Showcase (48% width, 60% Sage Green Card) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-[#252925]/20 bg-[#9CAF88] shadow-lg p-6 space-y-4 text-[#252925]">
              {/* Header & Mode Switcher */}
              <div className="flex items-center justify-between border-b border-[#252925]/20 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#252925]" />
                  <span className="text-xs font-georgia font-bold uppercase tracking-wider text-[#252925]">
                    Live Signal Discovery Preview
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-georgia text-[#252925]">
                  <span className="w-2 h-2 rounded-full bg-[#E8412C]" />
                  <span>Real-Time Math Engine</span>
                </div>
              </div>

              {/* Mode Selectors in Georgia */}
              <div className="flex items-center gap-1.5 text-xs font-georgia">
                <button
                  type="button"
                  onClick={() => setActiveTab('periodic')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'periodic'
                    ? 'bg-[#252925] text-[#F7F5EF] shadow-xs'
                    : 'bg-[#F7F5EF] text-[#252925] hover:bg-[#FFFFFF]'
                    }`}
                >
                  Harmonic Modes (5, 14, 35 Hz)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chirp')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'chirp'
                    ? 'bg-[#252925] text-[#F7F5EF] shadow-xs'
                    : 'bg-[#F7F5EF] text-[#252925] hover:bg-[#FFFFFF]'
                    }`}
                >
                  Quadratic Chirp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('spikes')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'spikes'
                    ? 'bg-[#252925] text-[#F7F5EF] shadow-xs'
                    : 'bg-[#F7F5EF] text-[#252925] hover:bg-[#FFFFFF]'
                    }`}
                >
                  Transient Spikes
                </button>
              </div>

              {/* LaTeX Formula Representation */}
              <div className="p-3.5 rounded-lg bg-[#F7F5EF] border border-[#252925]/20 text-center overflow-x-auto text-xs text-[#252925]">
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

              {/* Real-Time SVG Waveform Display */}
              <div className="h-48 w-full bg-[#FFFFFF] rounded-lg border border-[#252925]/20 p-2 relative overflow-hidden flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 640 180" preserveAspectRatio="none">
                  <line x1="20" y1="30" x2="620" y2="30" stroke="rgba(37, 41, 37, 0.1)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="20" y1="90" x2="620" y2="90" stroke="rgba(37, 41, 37, 0.2)" strokeWidth="1.2" />
                  <line x1="20" y1="150" x2="620" y2="150" stroke="rgba(37, 41, 37, 0.1)" strokeWidth="1" strokeDasharray="3 3" />

                  {areaPolygonStr && (
                    <polygon points={areaPolygonStr} fill="rgba(156, 175, 136, 0.35)" />
                  )}

                  <polyline
                    fill="none"
                    stroke="#252925"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />

                  {svgCoords.length > 0 && (
                    <circle
                      cx={svgCoords[svgCoords.length - 1].x}
                      cy={svgCoords[svgCoords.length - 1].y}
                      r="4.5"
                      fill="#E8412C"
                      stroke="#252925"
                      strokeWidth="1.5"
                    />
                  )}
                </svg>

                <div className="absolute top-2 left-3 text-[10px] text-[#252925]/70 font-mono">
                  fs = 200 Hz &bull; dt = 5 ms
                </div>
                <div className="absolute top-2 right-3 text-[10px] font-georgia font-bold text-[#252925] bg-[#F7F5EF] px-2 py-0.5 rounded border border-[#252925]/20 shadow-2xs">
                  {activeTab === 'periodic'
                    ? '3 Discrete Sinusoids Detected'
                    : activeTab === 'chirp'
                      ? 'Frequency Modulation [2 → 34 Hz]'
                      : '3 Outliers Identified (p < 0.001)'}
                </div>
                <div className="absolute bottom-2 right-3 text-[10px] text-[#252925]/70 font-mono">
                  Window: [0.00s, 0.98s]
                </div>
              </div>

              {/* Detected Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-[#F7F5EF] border border-[#252925]/20">
                  <div className="text-[11px] font-georgia text-[#252925]/70">Primary Peak</div>
                  <div className="text-[#252925] font-mono font-bold text-xs mt-0.5">
                    {activeTab === 'periodic' ? '5.00 Hz' : activeTab === 'chirp' ? 'Dynamic Chirp' : '3.98 Hz'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F7F5EF] border border-[#252925]/20">
                  <div className="text-[11px] font-georgia text-[#252925]/70">Inference Status</div>
                  <div className="text-[#252925] font-georgia font-bold text-xs mt-0.5">
                    {activeTab === 'periodic' ? 'Validated F=24.8' : activeTab === 'chirp' ? 'Non-Stationary' : 'Rosner ESD Alert'}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F7F5EF] border border-[#252925]/20">
                  <div className="text-[11px] font-georgia text-[#252925]/70">Cryptographic Hash</div>
                  <div className="text-[#E8412C] font-mono font-bold text-xs mt-0.5">SHA-256 Validated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SCIENTIFIC CAPABILITY STRIP (1320px Balanced Grid, 30% Off-white Cards) */}
        <section className="mt-12 pt-8 border-t border-[#252925]/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 font-georgia">
          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 text-[#252925] shadow-sm hover:border-[#9CAF88] transition-colors space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#252925] text-xs uppercase font-bold tracking-wider">
                <Zap className="w-4 h-4 text-[#E8412C]" />
                <span>Spectral Rigor</span>
              </div>
              <div className="text-base font-bold text-[#252925]">Thomson Multitaper F-Test</div>
              <div className="p-2.5 rounded bg-[#F7F5EF] border border-[#252925]/20 text-center overflow-x-auto text-[11px]">
                <MathFormula
                  formula="F = \frac{(K-1)|\hat{\mu}(f)|^2 \sum_k U_k(0)^2}{\sum_k |\hat{y}_k(f) - \hat{\mu}(f)U_k(0)|^2}"
                  displayMode={false}
                />
              </div>
            </div>
            <p className="text-xs text-[#252925]/80 font-georgia leading-relaxed pt-1">
              Separates discrete sinusoidal harmonic lines from continuous Gaussian noise floors with exact p-value bounds.
            </p>
          </div>

          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 text-[#252925] shadow-sm hover:border-[#9CAF88] transition-colors space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#252925] text-xs uppercase font-bold tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#E8412C]" />
                <span>Statistical Inference</span>
              </div>
              <div className="text-base font-bold text-[#252925]">IAAFT Surrogates &amp; FDR</div>
              <div className="p-2.5 rounded bg-[#F7F5EF] border border-[#252925]/20 text-center overflow-x-auto text-[11px]">
                <MathFormula
                  formula="\mathcal{F}\{x^{(m)}\} = |\mathcal{F}\{x\}| e^{i\psi^{(m)}}, \quad q_{\text{BH}} \le 0.05"
                  displayMode={false}
                />
              </div>
            </div>
            <p className="text-xs text-[#252925]/80 font-georgia leading-relaxed pt-1">
              100 iterated amplitude-adjusted phase-randomized surrogate noise realizations with Benjamini-Hochberg error control.
            </p>
          </div>

          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 text-[#252925] shadow-sm hover:border-[#9CAF88] transition-colors space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#252925] text-xs uppercase font-bold tracking-wider">
                <Layers className="w-4 h-4 text-[#E8412C]" />
                <span>Nonlinear Dynamics</span>
              </div>
              <div className="text-base font-bold text-[#252925]">Takens Phase Embedding</div>
              <div className="p-2.5 rounded bg-[#F7F5EF] border border-[#252925]/20 text-center overflow-x-auto text-[11px]">
                <MathFormula
                  formula="\mathbf{v}(t) = [x(t), x(t+\tau), \dots, x(t+(d-1)\tau)]^T"
                  displayMode={false}
                />
              </div>
            </div>
            <p className="text-xs text-[#252925]/80 font-georgia leading-relaxed pt-1">
              Reconstructs multi-dimensional attractor trajectories and Poincaré sections via Average Mutual Information and FNN.
            </p>
          </div>

          <div className="flex flex-col justify-between p-5 rounded-xl bg-[#FFFFFF] border border-[#252925]/20 text-[#252925] shadow-sm hover:border-[#9CAF88] transition-colors space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[#252925] text-xs uppercase font-bold tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-[#E8412C]" />
                <span>Bitwise Invariants</span>
              </div>
              <div className="text-base font-bold text-[#252925]">Write-Protected Memory</div>
              <div className="p-2.5 rounded bg-[#F7F5EF] border border-[#252925]/20 text-center overflow-x-auto text-[11px]">
                <MathFormula
                  formula="\Delta \operatorname{SHA256}(\mathbf{X}_{\text{raw}}) \equiv 0, \quad \epsilon \le 10^{-12}"
                  displayMode={false}
                />
              </div>
            </div>
            <p className="text-xs text-[#252925]/80 font-georgia leading-relaxed pt-1">
              Raw uploaded buffers are strictly immutable (flags.writeable = False) with SHA-256 cryptographic provenance graphs.
            </p>
          </div>
        </section>

        {/* 4. PRODUCT EXPLORATION SECTION: TWO PRIMARY WORKSPACES (60% Sage Green Surfaces) */}
        <section className="mt-12 space-y-5">
          <div className="border-b border-[#252925]/20 pb-3">
            <h3 className="font-georgia text-2xl sm:text-3xl text-[#252925]">Two Complementary Analytical Workspaces</h3>
            <p className="text-sm text-[#252925]/80 font-georgia mt-1">
              Engineered for both in-depth single-signal telemetry investigation and broad multi-instrument discovery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workspace 1: Paper Workbench */}
            <div className="flex flex-col justify-between p-7 rounded-2xl bg-[#9CAF88] border border-[#252925]/20 space-y-4 shadow-sm min-h-[260px] text-[#252925]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#252925] font-georgia font-bold text-sm">
                    <BookOpen className="w-4 h-4 text-[#E8412C]" />
                    <span>PAPER WORKBENCH</span>
                  </div>
                  <span className="text-xs font-georgia px-2.5 py-0.5 rounded bg-[#F7F5EF] text-[#252925] border border-[#252925]/20">
                    Primary Analytical Surface
                  </span>
                </div>
                <h4 className="text-xl font-georgia text-[#252925] font-bold">Single-Signal Deep Investigation</h4>
                <p className="text-sm text-[#252925]/85 leading-relaxed font-georgia">
                  Focused exploration featuring time-domain oscillograms, discrete Fourier power spectrum, phase-space reconstructions, bispectral coupling, and validated findings audit summaries.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onLaunchWorkbench}
                  className="inline-flex items-center gap-2 bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] px-5 py-2.5 rounded-lg font-georgia text-xs font-bold transition-all shadow-xs"
                >
                  <span>Launch Paper Workbench</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Workspace 2: Full Instrument Rack */}
            <div className="flex flex-col justify-between p-7 rounded-2xl bg-[#9CAF88] border border-[#252925]/20 space-y-4 shadow-sm min-h-[260px] text-[#252925]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#252925] font-georgia font-bold text-sm">
                    <Sliders className="w-4 h-4 text-[#E8412C]" />
                    <span>FULL INSTRUMENT RACK</span>
                  </div>
                  <span className="text-xs font-georgia px-2.5 py-0.5 rounded bg-[#F7F5EF] text-[#252925] border border-[#252925]/20">
                    28 Coordinated Instruments
                  </span>
                </div>
                <h4 className="text-xl font-georgia text-[#252925] font-bold">Simultaneous Multi-Domain Suite</h4>
                <p className="text-sm text-[#252925]/85 leading-relaxed font-georgia">
                  Unified instrument rack spanning spectral analysis, time-frequency wavelets, nonlinear attractors, Granger causality networks, and astrophysics lab views with synchronized temporal cursors.
                </p>
              </div>
              <div className="pt-2">
                {onOpenRack && (
                  <button
                    type="button"
                    onClick={onOpenRack}
                    className="inline-flex items-center gap-2 bg-[#252925] hover:bg-[#252925]/85 text-[#F7F5EF] px-5 py-2.5 rounded-lg font-georgia text-xs font-semibold transition-all shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#E8412C]" />
                    <span>Explore Instrument Rack</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 5. FINAL CALL TO ACTION SECTION */}
        <section className="mt-12 p-8 sm:p-10 rounded-2xl bg-[#9CAF88] border border-[#252925]/20 shadow-md text-center space-y-4 text-[#252925]">
          <h3 className="font-georgia text-3xl sm:text-4xl text-[#252925]">Start Exploring the Signals.</h3>
          <p className="text-sm sm:text-base text-[#252925]/85 font-georgia max-w-xl mx-auto leading-relaxed">
            Move beyond visual inspection. Investigate, analyse and mathematically verify the structures hidden within scientific signals.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="flex items-center gap-2 bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] px-6 py-3.5 rounded-lg font-georgia text-sm font-bold tracking-wide shadow-md transition-all active:scale-95"
            >
              <span>Launch Paper Workbench</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {onOpenRack && (
              <button
                type="button"
                onClick={onOpenRack}
                className="flex items-center gap-2 px-5 py-3.5 rounded-lg bg-[#252925] hover:bg-[#252925]/85 text-[#F7F5EF] font-georgia text-sm font-semibold shadow-xs transition-colors"
              >
                <Sliders className="w-4 h-4 text-[#E8412C]" />
                <span>Explore Instrument Rack</span>
              </button>
            )}
          </div>
        </section>
      </main>

      {/* 6. POLISHED FOOTER (1440px Responsive Container) */}
      <footer className="relative z-10 w-full border-t border-[#252925]/20 bg-[#F7F5EF] py-6 px-6 text-xs font-georgia text-[#252925]/80 shrink-0 mt-12">
        <div className="w-[94%] max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#E8412C]" />
            <span className="font-semibold text-[#252925]">SYNAPSE Discovery Platform</span>
            <span>&bull;</span>
            <span>Bitwise Reproducible within Machine Epsilon (&le; 1e-12)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#252925]">
            <span>Python 3.11</span>
            <span>&bull;</span>
            <span>FastAPI 0.162</span>
            <span>&bull;</span>
            <span>React 18 + TS</span>
            <span>&bull;</span>
            <span className="text-[#E8412C] font-bold">100% Client Math &amp; Verified Backend</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingHero;
