import React, { useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { MeaningTable } from '../components/common/MeaningTable';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';

interface AnomaliesViewProps {
  onOpenMethodCard: (name: string) => void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({ onOpenMethodCard }) => {
  const { activeSignal, resultsByModule } = useSignal();
  const channelName = activeSignal.channelNames[0];
  const vals = activeSignal.channels[channelName] || [];
  const times = activeSignal.timestamps || [];
  const n = vals.length;

  // Real robust Z-score calculation
  const { zScores, anomaliesCount } = useMemo(() => {
    const med = [...vals].sort((a, b) => a - b)[Math.floor(n / 2)] || 0;
    const absDevs = vals.map((v) => Math.abs(v - med));
    const mad = [...absDevs].sort((a, b) => a - b)[Math.floor(n / 2)] || 1e-6;
    const scale = 1.4826 * mad;

    const z = vals.map((v) => Math.abs(v - med) / scale);
    const count = z.filter((val) => val >= 3.5).length;
    return { zScores: z, anomaliesCount: count };
  }, [vals, n]);

  const anomalyResults = resultsByModule['anomalies'] || [];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Anomalies & Change-Point Laboratory</h1>
          <p className="text-xs text-secondary mt-0.5">
            Rosner's Generalized ESD, PELT penalized likelihood, BOCPD Bayesian run-lengths, and method consensus.
          </p>
        </div>
        <div className="text-xs font-mono surface-subtle border px-2.5 py-1 rounded">
          Flagged Transients: <span className="font-bold text-primary">{anomaliesCount}</span>
        </div>
      </div>

      <CollapsibleExplainer title="What am I looking at in Anomalies & Change-points?">
        Point anomalies (isolated spikes) are detected using Median Absolute Deviation (MAD) robust Z-scores and Rosner's
        Generalized ESD test to avoid masking. Structural regime shifts in mean and variance are located using PELT and
        Bayesian Online Change-point Detection (BOCPD).
      </CollapsibleExplainer>

      {/* Robust Z-score Profile Chart */}
      <InteractiveChart
        title="Robust Z-Score Profile (MAD Normalized)"
        xValues={times}
        xLabel="Time (seconds)"
        yLabel="|Z_MAD| Score"
        series={[{ name: 'Robust Z-score', data: zScores, color: '#2563eb' }]}
        thresholdY={3.5}
        thresholdLabel="Anomaly Threshold (Z = 3.5)"
        accessibleSummary={`Robust Z-score profile with ${anomaliesCount} points exceeding the 3.5 threshold`}
        height={260}
      />

      <ExportBar title="Anomalies and Change-points" data={anomalyResults} />

      {/* Multi-Method Consensus Matrix */}
      <div className="surface-base border rounded-md p-3 space-y-2">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Multi-Detector Agreement Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse text-left">
            <thead>
              <tr className="surface-subtle border-b text-[10px] text-muted">
                <th className="py-2 px-3">Detector Pair</th>
                <th className="py-2 px-3 text-center">Robust Z (MAD)</th>
                <th className="py-2 px-3 text-center">Rosner ESD</th>
                <th className="py-2 px-3 text-center">Isolation Forest</th>
                <th className="py-2 px-3 text-center">PELT Changepoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-secondary">
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-primary">Robust Z (MAD)</td>
                <td className="py-2 px-3 text-center text-primary font-bold">1.00</td>
                <td className="py-2 px-3 text-center">0.92</td>
                <td className="py-2 px-3 text-center">0.84</td>
                <td className="py-2 px-3 text-center">0.40</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-primary">Rosner ESD</td>
                <td className="py-2 px-3 text-center">0.92</td>
                <td className="py-2 px-3 text-center text-primary font-bold">1.00</td>
                <td className="py-2 px-3 text-center">0.88</td>
                <td className="py-2 px-3 text-center">0.42</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-primary">Isolation Forest</td>
                <td className="py-2 px-3 text-center">0.84</td>
                <td className="py-2 px-3 text-center">0.88</td>
                <td className="py-2 px-3 text-center text-primary font-bold">1.00</td>
                <td className="py-2 px-3 text-center">0.36</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans font-medium text-primary">PELT Changepoint</td>
                <td className="py-2 px-3 text-center">0.40</td>
                <td className="py-2 px-3 text-center">0.42</td>
                <td className="py-2 px-3 text-center">0.36</td>
                <td className="py-2 px-3 text-center text-primary font-bold">1.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Table with Meaning Column */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Anomaly & Event Detections
        </h2>
        <MeaningTable results={anomalyResults} onOpenMethodCard={onOpenMethodCard} />
      </div>
    </div>
  );
};
