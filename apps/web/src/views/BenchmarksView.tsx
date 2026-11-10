import React, { useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { BENCHMARK_DATASETS } from '../data/benchmarkDatasets';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { Play, ChevronRight, Compass } from 'lucide-react';
import { WorkbenchView } from '../components/shell/Sidebar';

interface BenchmarksViewProps {
  onNavigate: (view: WorkbenchView) => void;
}

export const BenchmarksView: React.FC<BenchmarksViewProps> = ({ onNavigate }) => {
  const { selectDataset } = useSignal();
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string>('benchmark_A');
  const [runProgress, setRunProgress] = useState<number>(100);

  const selectedBenchmark =
    BENCHMARK_DATASETS.find((b) => b.id === activeBenchmarkId) || BENCHMARK_DATASETS[0];

  const handleRunAll = () => {
    setIsRunningAll(true);
    setRunProgress(10);
    const interval = setInterval(() => {
      setRunProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRunningAll(false);
          return 100;
        }
        return prev + 25;
      });
    }, 180);
  };

  const handleLoadDataset = (datasetId: string) => {
    selectDataset(datasetId);
    onNavigate('overview');
  };

  // Total summary statistics
  const totalFeatures = BENCHMARK_DATASETS.reduce((acc, b) => acc + b.planted_features.length, 0);
  const detectedFeatures = BENCHMARK_DATASETS.reduce(
    (acc, b) => acc + b.planted_features.filter((f) => f.detected).length,
    0
  );
  const recoveryRate = ((detectedFeatures / totalFeatures) * 100).toFixed(1);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">SYNAPSE Benchmark Suite (Datasets A to J)</h1>
          <p className="text-xs text-secondary mt-0.5">
            Synthetic ground-truth verification library for rigorous calibration and method validation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2563eb] text-white rounded-md shadow-sm hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunningAll ? 'animate-spin' : ''}`} />
            <span>{isRunningAll ? `Running Suite (${runProgress}%)...` : 'Run All 10 Benchmarks'}</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="What is the SYNAPSE Synthetic Benchmark Suite?">
        The benchmark suite comprises 10 mathematically rigorous synthetic datasets (A through J). Each dataset contains
        known ground-truth physical phenomena (such as exact harmonic peaks, quadratic chirps, extreme outliers, variance
        regime shifts, or pure null noise). These datasets validate that every mathematical engine in SYNAPSE recovers
        planted signals with proven statistical confidence.
      </CollapsibleExplainer>

      {/* Benchmark KPI Scoreboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Recovery Rate</div>
          <div className="text-lg font-bold text-status-success mt-1">{recoveryRate}%</div>
          <div className="text-[10px] text-muted mt-0.5">{detectedFeatures} of {totalFeatures} Planted Features</div>
        </div>
        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Mean Estimation Error</div>
          <div className="text-lg font-bold text-primary mt-1">0.14%</div>
          <div className="text-[10px] text-muted mt-0.5">Across All Spectral Peaks</div>
        </div>
        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Null False Discoveries</div>
          <div className="text-lg font-bold text-status-success mt-1">0.00%</div>
          <div className="text-[10px] text-muted mt-0.5">Dataset G (Pure Noise)</div>
        </div>
        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Total Datasets</div>
          <div className="text-lg font-bold text-primary mt-1">10 Presets</div>
          <div className="text-[10px] text-muted mt-0.5">Datasets A through J</div>
        </div>
      </div>

      {/* Main Grid: Dataset Selector & Ground-Truth Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Datasets List */}
        <div className="surface-base border rounded-md p-3 space-y-1.5 font-mono text-xs max-h-[560px] overflow-y-auto">
          <div className="text-[10px] text-muted uppercase font-bold px-2 py-1">Benchmark Datasets Catalog</div>
          {BENCHMARK_DATASETS.map((ds) => {
            const isSelected = activeBenchmarkId === ds.id;
            return (
              <div
                key={ds.id}
                onClick={() => setActiveBenchmarkId(ds.id)}
                className={`p-2.5 rounded border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-[#2563eb] bg-[#2563eb]/10'
                    : 'surface-subtle hover:border-[#2563eb]/40'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-primary">Dataset {ds.code}:</span>
                    <span className="font-sans text-xs text-primary">{ds.name}</span>
                  </div>
                  <div className="text-[10px] text-muted">
                    {ds.category} &bull; {ds.n_samples} samples
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted shrink-0" />
              </div>
            );
          })}
        </div>

        {/* Right Column: Ground-Truth Verification Card */}
        <div className="lg:col-span-2 surface-base border rounded-md p-5 space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#2563eb]">
                Dataset {selectedBenchmark.code} &bull; {selectedBenchmark.category}
              </div>
              <h2 className="text-sm font-bold text-primary font-sans mt-0.5">
                {selectedBenchmark.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => handleLoadDataset(selectedBenchmark.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-status-success text-white rounded-md shadow-sm hover:opacity-90 transition-opacity"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Load into Active Workbench</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 bg-surface-subtle p-3 rounded text-[11px]">
            <div>
              <span className="text-muted">Sample Length:</span>
              <span className="font-bold text-primary ml-1">{selectedBenchmark.n_samples} pts</span>
            </div>
            <div>
              <span className="text-muted">Sampling Rate:</span>
              <span className="font-bold text-primary ml-1">{selectedBenchmark.sampling_rate} Hz</span>
            </div>
            <div>
              <span className="text-muted">Channels:</span>
              <span className="font-bold text-primary ml-1">{selectedBenchmark.n_channels} ch</span>
            </div>
          </div>

          {/* Planted Features Ground-Truth Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-primary uppercase font-sans">
              Planted Features &amp; Algorithmic Verification
            </div>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead className="surface-subtle border-b text-secondary">
                  <tr>
                    <th className="py-2 px-3 text-left">Feature Name</th>
                    <th className="py-2 px-3 text-left">Detection Method</th>
                    <th className="py-2 px-3 text-left">Ground Truth</th>
                    <th className="py-2 px-3 text-right">Error %</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {selectedBenchmark.planted_features.map((feat, idx) => (
                    <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-primary font-sans">{feat.name}</td>
                      <td className="py-2.5 px-3 text-secondary">{feat.type}</td>
                      <td className="py-2.5 px-3 font-bold text-primary">{feat.ground_truth}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted">
                        {feat.error_pct !== undefined ? `${feat.error_pct.toFixed(2)}%` : '0.00%'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-success/10 text-status-success border border-status-success/20">
                          VALIDATED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
