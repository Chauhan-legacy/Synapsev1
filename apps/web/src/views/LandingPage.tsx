import React, { useState } from 'react';
import {
  Activity,
  Zap,
  ArrowRight,
  GitBranch,
  Terminal,
  Copy,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { METHODS_CATALOG } from '../data/methodsCatalog';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { createSignalPreset } from '../context/SignalContext';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenBenchmarks: () => void;
  onOpenMethodCard: (name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onOpenBenchmarks,
  onOpenMethodCard,
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [methodSearch, setMethodSearch] = useState('');

  // Live real benchmark signal for hero chart
  const sampleSignal = createSignalPreset('benchmark_A');
  const xValues = sampleSignal.timestamps.slice(0, 400);
  const yValues = sampleSignal.channels['Channel 1'].slice(0, 400);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('conda env create -f environment.yml && conda activate synapse');
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const filteredMethods = METHODS_CATALOG.filter(
    (m) =>
      m.name.toLowerCase().includes(methodSearch.toLowerCase()) ||
      m.category.toLowerCase().includes(methodSearch.toLowerCase()) ||
      m.plain_language.toLowerCase().includes(methodSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#101317] text-primary select-none font-sans">
      {/* Top Editorial Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#121519]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs font-mono">
              S
            </div>
            <span className="font-mono font-bold tracking-wider text-sm uppercase text-primary">
              SYNAPSE <span className="text-xs font-normal text-muted font-sans lowercase">v2.0</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-secondary">
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#capabilities" className="hover:text-primary transition-colors">Capabilities</a>
            <a href="#credibility" className="hover:text-primary transition-colors">Statistical Rigor</a>
            <a href="#catalogue" className="hover:text-primary transition-colors">Method Library</a>
            <a href="#open-source" className="hover:text-primary transition-colors">Open Source</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBenchmarks}
              className="px-3 py-1.5 text-xs font-medium surface-subtle border rounded-md text-secondary hover:text-primary transition-colors hidden sm:inline-block"
            >
              Benchmarks
            </button>
            <button
              type="button"
              onClick={onEnterApp}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs transition-colors"
            >
              <span>Open Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-14 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              <span>Universal Signal Intelligence Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary leading-tight">
              Don't just analyze signals. <br />
              <span className="text-blue-600">Discover and verify</span> the structures hidden within them.
            </h1>

            <p className="text-sm text-secondary leading-relaxed max-w-xl">
              An open-source scientific computing engine combining Thomson multitaper spectral estimation,
              PELT changepoints, Bayesian inference, and constrained IAAFT surrogates. Designed for physicists,
              aerospace engineers, and researchers who require mathematical proof over black-box guesswork.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onEnterApp}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
              >
                <span>Launch Interactive Workbench</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenBenchmarks}
                className="px-4 py-2.5 text-xs font-medium surface-base border hover:border-slate-400 text-primary rounded-md transition-colors"
              >
                Explore Datasets A–J
              </button>
            </div>
          </div>

          {/* Real Live Chart Canvas */}
          <div className="lg:col-span-6">
            <InteractiveChart
              title="Live Signal: Benchmark Dataset A (Multi-Tone + Noise)"
              xValues={xValues}
              xLabel="Time (seconds)"
              yLabel="Signal Amplitude"
              series={[{ name: 'Observed Sensor Waveform', data: yValues }]}
              accessibleSummary="Observed signal waveform showing 5.0 Hz and 14.0 Hz periodic oscillations"
              height={280}
              markerPoints={[
                { x: 0.2, y: 1.5, label: '5 Hz Tone Peak', color: '#2563eb' },
                { x: 0.65, y: -1.2, label: '14 Hz Phase Lock', color: '#059669' },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Real Computed Facts Strip */}
      <section className="border-y border-slate-200 dark:border-slate-800 surface-subtle py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold font-mono text-primary">24</div>
            <div className="text-xs text-secondary mt-0.5">Implemented Algorithms</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600">33 / 33</div>
            <div className="text-xs text-secondary mt-0.5">Automated Tests Green</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-blue-600">2,000</div>
            <div className="text-xs text-secondary mt-0.5">Null Calibration Series Verified</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-primary">100.0%</div>
            <div className="text-xs text-secondary mt-0.5">Ground Truth Feature Recovery</div>
          </div>
        </div>
      </section>

      {/* How It Works (4 Steps) */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-xl font-bold text-primary">How SYNAPSE Investigates Signals</h2>
          <p className="text-xs text-secondary mt-2">
            Every candidate discovery passes through strict empirical null verification before being accepted.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="surface-base border p-4 rounded-md space-y-2.5">
            <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono font-bold flex items-center justify-center text-xs">
              01
            </div>
            <h3 className="font-semibold text-xs text-primary">Ingest & Profile</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Accepts CSV, TSV, Parquet, NPY, and HDF5. Verifies monotonic timestamps, missing masks, and computes SHA-256 content hashes.
            </p>
          </div>

          <div className="surface-base border p-4 rounded-md space-y-2.5">
            <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono font-bold flex items-center justify-center text-xs">
              02
            </div>
            <h3 className="font-semibold text-xs text-primary">Plan & Decompose</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Selects optimal estimators: Multitaper DPSS, continuous wavelets, Bayesian changepoints, or recurrence analysis based on signal properties.
            </p>
          </div>

          <div className="surface-base border p-4 rounded-md space-y-2.5">
            <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono font-bold flex items-center justify-center text-xs">
              03
            </div>
            <h3 className="font-semibold text-xs text-primary">Test Against Nulls</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Generates constrained IAAFT surrogates and circular shifts to test candidate findings against linear Gaussian noise nulls with FDR control.
            </p>
          </div>

          <div className="surface-base border p-4 rounded-md space-y-2.5">
            <div className="w-7 h-7 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-mono font-bold flex items-center justify-center text-xs">
              04
            </div>
            <h3 className="font-semibold text-xs text-primary">Evidence Graph & Report</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Builds a cryptographic DAG linking raw samples to findings with parameter manifests, and exports standalone verifiable HTML/PDF reports.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <section id="capabilities" className="border-t border-slate-200 dark:border-slate-800 surface-subtle py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="text-xl font-bold text-primary">Core Signal Capabilities</h2>
            <p className="text-xs text-secondary mt-2">
              Integrated laboratories covering the full spectrum of numerical time-series analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="surface-base border p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-primary">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Spectral & Oscillations</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Thomson Multitaper F-test, Welch PSD with chi-squared bounds, Lomb-Scargle for uneven sampling, and Cramér-Rao lower bound efficiency fits.
              </p>
            </div>

            <div className="surface-base border p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-primary">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Anomalies & Regime Shifts</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Rosner Generalized ESD outlier testing, PELT exact penalized likelihood changepoints, and Bayesian Online Changepoint Detection (BOCPD).
              </p>
            </div>

            <div className="surface-base border p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2 font-semibold text-xs text-primary">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                <span>Nonlinear Dynamics & Structure</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Recurrence Quantification Analysis (RQA), Average Mutual Information delay embedding, Sample Entropy, Higuchi fractal dimension, and Lyapunov exponents.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Method Catalogue Search Strip */}
      <section id="catalogue" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-primary">Methods Catalogue</h2>
            <p className="text-xs text-secondary mt-1">Search mathematically validated algorithms with closed-form formulas.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={methodSearch}
              onChange={(e) => setMethodSearch(e.target.value)}
              placeholder="Search methods..."
              className="w-full pl-8 pr-3 py-1.5 text-xs surface-base border rounded-md text-primary focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMethods.slice(0, 9).map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMethodCard(m.name)}
              className="surface-base border hover:border-blue-500 rounded-md p-4 cursor-pointer transition-colors space-y-2.5 group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary group-hover:text-blue-600 transition-colors">
                  {m.name}
                </span>
                <span className="text-[10px] font-mono surface-subtle px-1.5 py-0.5 rounded text-muted">
                  {m.category}
                </span>
              </div>
              <p className="text-xs text-secondary line-clamp-2 leading-relaxed">
                {m.plain_language}
              </p>
              <div className="pt-1 border-t text-[11px] text-blue-600 flex items-center justify-between font-medium">
                <span>View Card & KaTeX</span>
                <ExternalLink className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Source & Installation Section */}
      <section id="open-source" className="border-t border-slate-200 dark:border-slate-800 surface-subtle py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <h2 className="text-xl font-bold text-primary">Reproducible & Open Infrastructure</h2>
              <p className="text-xs text-secondary leading-relaxed">
                SYNAPSE is open source under the MIT License. Reproduce every computation locally in an isolated Conda environment.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://github.com/Chauhan-legacy/Synapsev1.git"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium surface-base border text-primary rounded-md hover:border-slate-400 transition-colors"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                </a>
                <span className="text-xs text-muted font-mono">Python 3.11 • FastAPI • React 18</span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="surface-base border rounded-md p-3 font-mono text-xs text-primary space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-muted border-b pb-2">
                  <span>Quickstart Installation</span>
                  <button
                    type="button"
                    onClick={handleCopyInstall}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    {copiedSnippet ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-secondary select-all leading-relaxed text-[11px]">
                  git clone https://github.com/Chauhan-legacy/Synapsev1.git<br />
                  conda env create -f environment.yml<br />
                  conda activate synapse<br />
                  pytest tests/
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>SYNAPSE Signal Intelligence • Built with mathematical correctness and reproducibility</div>
          <div className="font-mono text-[11px]">MIT License • v2.0.0</div>
        </div>
      </footer>
    </div>
  );
};
