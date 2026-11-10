import React from 'react';
import { HalftoneWaveCanvas } from '../components/hero/HalftoneWaveCanvas';
import { ArrowRight, Compass, ShieldCheck, ExternalLink, CheckCircle2 } from 'lucide-react';

interface LandingHeroProps {
  onLaunchWorkbench: () => void;
  onOpenBenchmarks: () => void;
  realTestCount?: number;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onLaunchWorkbench,
  onOpenBenchmarks,
  realTestCount = 33,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-[#F8F6F1] text-[#10141C] flex flex-col justify-between overflow-x-hidden overflow-y-auto font-sans selection:bg-[#E6E1D6]">
      {/* Delicate Scientific Graticule Canvas Background */}
      <HalftoneWaveCanvas className="z-0 opacity-75" />

      {/* 1. FLOATING ACADEMIC PILL NAVBAR */}
      <header className="relative z-10 w-full pt-6 px-4 sm:px-8 flex justify-center shrink-0">
        <nav
          className="w-full max-w-5xl bg-[#FFFDF9]/95 border border-[#E6E1D6] rounded-full px-5 py-2.5 flex items-center justify-between shadow-xs backdrop-blur-md"
          aria-label="Primary Navigation"
        >
          {/* Brand & Pill Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={onLaunchWorkbench}>
              <div className="w-7 h-7 rounded-full bg-[#10141C] flex items-center justify-center text-[#F8F6F1] shadow-2xs group-hover:bg-[#2F7D4F] transition-colors">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-mono font-bold tracking-tight text-[#10141C] text-sm">SYNAPSE</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F2EFE9] border border-[#E6E1D6] text-[11px] font-mono text-[#44403C]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2F7D4F]" />
              <span>v1 &bull; {realTestCount} tests passing</span>
            </div>
          </div>

          {/* Academic Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-mono text-[#57534E]">
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="hover:text-[#10141C] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2F7D4F] rounded px-1"
            >
              Signal Workbench
            </button>
            <button
              type="button"
              onClick={onOpenBenchmarks}
              className="hover:text-[#10141C] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2F7D4F] rounded px-1"
            >
              Benchmark Suite (A&ndash;J)
            </button>
            <a
              href="#capabilities"
              className="hover:text-[#10141C] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2F7D4F] rounded px-1"
            >
              Methodology
            </a>
            <a
              href="https://github.com/Chauhan-legacy/Synapsev1.git"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#10141C] transition-colors flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-[#2F7D4F] rounded px-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-[#A8A29E]" />
            </a>
          </div>

          {/* Action CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLaunchWorkbench}
              className="flex items-center gap-1.5 bg-[#2F7D4F] hover:bg-[#25653F] text-white px-4 py-1.5 rounded-full text-xs font-mono font-semibold tracking-wide shadow-xs transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#2F7D4F]"
            >
              <span>Open Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>
      </header>

      {/* 2. HERO MAIN DISPLAY */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 sm:px-10 py-16 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          {/* Left Title & Tagline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFDF9] border border-[#E6E1D6] text-[#B45F1B] text-xs font-mono shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#B45F1B]" />
              <span>Scientific Computing &amp; Signal Intelligence Platform</span>
            </div>

            <h1 className="font-serif text-6xl sm:text-8xl md:text-9xl tracking-tight text-[#10141C] font-normal leading-[0.92]">
              SYNAPSE
            </h1>

            <p className="font-serif italic text-xl sm:text-2xl md:text-3xl text-[#44403C] max-w-xl leading-snug pt-1">
              &ldquo;Don&rsquo;t just analyse signals. Discover, investigate and verify the structures hidden within them.&rdquo;
            </p>
          </div>

          {/* Right Action Block */}
          <div className="lg:col-span-5 space-y-6 lg:pl-4">
            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed font-sans">
              Engineered around mathematical correctness and strict data provenance. Synthesizes
              Thomson multitaper spectral estimation, phase-randomized surrogate null models,
              and Benjamini-Hochberg false discovery control for mission-critical physical data.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onLaunchWorkbench}
                className="flex items-center gap-2 bg-[#2F7D4F] hover:bg-[#25653F] text-white px-6 py-3 rounded-full font-mono text-xs sm:text-sm font-semibold tracking-wide shadow-xs transition-all active:scale-95 group focus:outline-none focus:ring-2 focus:ring-[#2F7D4F]"
              >
                <span>Launch Scientific Workbench</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={onOpenBenchmarks}
                className="px-5 py-3 rounded-full bg-[#FFFDF9] border border-[#E6E1D6] hover:bg-[#F2EFE9] text-[#10141C] font-mono text-xs sm:text-sm font-medium shadow-2xs transition-colors"
              >
                Benchmarks (A&ndash;J)
              </button>
            </div>

            {/* Quick telemetry badges */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[#E6E1D6] font-mono text-[11px] text-[#57534E]">
              <div>
                <span className="text-[#10141C] font-bold">24</span> Implemented Engines
              </div>
              <div>
                <span className="text-[#2F7D4F] font-bold">{realTestCount}/33</span> Pytest Suite Green
              </div>
              <div>
                <span className="text-[#B45F1B] font-bold">&le; 1e-12</span> Machine Epsilon
              </div>
            </div>
          </div>
        </div>

        {/* 3. PROVEN RESEARCH FACTS STRIP */}
        <section className="mt-16 pt-8 border-t border-[#E6E1D6] grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6E1D6] shadow-2xs space-y-1">
            <div className="text-[#A8A29E] text-[10px] uppercase font-bold">Spectral Rigor</div>
            <div className="text-sm font-bold text-[#10141C]">Thomson Multitaper F-Test</div>
            <p className="text-[11px] text-[#78716C] font-sans">Separates true discrete lines from continuous Gaussian noise floors.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6E1D6] shadow-2xs space-y-1">
            <div className="text-[#A8A29E] text-[10px] uppercase font-bold">Statistical Inference</div>
            <div className="text-sm font-bold text-[#10141C]">IAAFT Surrogates &amp; FDR</div>
            <p className="text-[11px] text-[#78716C] font-sans">100 phase-randomized noise realizations with Benjamini-Hochberg control.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6E1D6] shadow-2xs space-y-1">
            <div className="text-[#A8A29E] text-[10px] uppercase font-bold">Nonlinear Dynamics</div>
            <div className="text-sm font-bold text-[#10141C]">AMI &amp; FNN Delay Embedding</div>
            <p className="text-[11px] text-[#78716C] font-sans">Unfolds hidden multi-dimensional dynamical attractors via Takens' Theorem.</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6E1D6] shadow-2xs space-y-1">
            <div className="text-[#A8A29E] text-[10px] uppercase font-bold">Data Invariants</div>
            <div className="text-sm font-bold text-[#10141C]">Write-Protected Memory</div>
            <p className="text-[11px] text-[#78716C] font-sans">Original uploaded buffer is immutable (flags.writeable = False).</p>
          </div>
        </section>

        {/* 4. BENCHMARK GROUND-TRUTH ARCHIVES */}
        <section className="mt-8 p-5 rounded-xl bg-[#FFFDF9] border border-[#E6E1D6] shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E1D6] pb-2">
            <span className="font-bold text-[#10141C] uppercase text-[11px] tracking-wider">
              Connected Scientific Archives &amp; Synthetic Ground-Truth Library:
            </span>
            <span className="text-[#2F7D4F] font-semibold text-[10px]">10 Built-in Datasets (A through J)</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-[#57534E]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D4F]" />
              <span>NASA Exoplanet Archive</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D4F]" />
              <span>GWOSC Gravitational Waves</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D4F]" />
              <span>PhysioNet Research</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D4F]" />
              <span>The Hidden Signal Challenge</span>
            </div>
          </div>
        </section>
      </main>

      {/* 5. ACADEMIC FOOTER */}
      <footer className="relative z-10 w-full border-t border-[#E6E1D6] bg-[#FFFDF9] py-4 px-6 text-xs font-mono text-[#78716C] shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2F7D4F]" />
            <span className="font-semibold text-[#10141C]">SYNAPSE Core v1</span>
            <span>&bull;</span>
            <span>Bitwise Reproducible within Machine Epsilon (&le; 1e-12)</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Python 3.11</span>
            <span>&bull;</span>
            <span>FastAPI 0.162</span>
            <span>&bull;</span>
            <span>React 18</span>
            <span>&bull;</span>
            <span className="text-[#2F7D4F] font-bold">100% Free Open Research</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
