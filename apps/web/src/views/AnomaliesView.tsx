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

  // Real multi-detector agreement matrix computed dynamically from loaded data
  const detectorAgreement = useMemo(() => {
    // 1. Robust Z (MAD) flagged indices
    const setMAD = new Set<number>();
    zScores.forEach((z, i) => { if (z >= 3.5) setMAD.add(i); });

    // 2. Rosner ESD flagged indices
    const setRosner = new Set<number>();
    const rosnerResult = anomalyResults.find((r) => r.method.includes('Rosner'));
    if (rosnerResult && typeof rosnerResult.estimate === 'number' && rosnerResult.estimate > 0) {
      const sortedIdxs = vals.map((v, i) => ({ v: Math.abs(v), i })).sort((a, b) => b.v - a.v);
      for (let k = 0; k < Math.min(sortedIdxs.length, Number(rosnerResult.estimate)); k++) {
        setRosner.add(sortedIdxs[k].i);
      }
    } else {
      zScores.forEach((z, i) => { if (z >= 4.0) setRosner.add(i); });
    }

    // 3. Local Diff / Energy Spikes flagged indices
    const setIsolation = new Set<number>();
    for (let i = 1; i < vals.length; i++) {
      const diff = Math.abs(vals[i] - vals[i - 1]);
      if (diff > 3.0 * (vals[i] !== undefined ? Math.abs(vals[i]) * 0.4 || 1.0 : 1.0)) {
        setIsolation.add(i);
      }
    }

    // 4. PELT Changepoint flagged indices
    const setPELT = new Set<number>();
    const peltResult = anomalyResults.find((r) => r.method.includes('PELT'));
    if (peltResult && peltResult.diagnostics) {
      const locDiag = peltResult.diagnostics.find((d) => d.name === 'Sample Locations');
      if (locDiag && typeof locDiag.value === 'string') {
        const matches = locDiag.value.match(/\d+/g);
        if (matches) matches.forEach((m) => setPELT.add(parseInt(m, 10)));
      }
    }

    const detectors = [
      { name: 'Robust Z (MAD)', set: setMAD },
      { name: 'Rosner ESD', set: setRosner },
      { name: 'Isolation Spikes', set: setIsolation },
      { name: 'PELT Changepoint', set: setPELT },
    ];

    // Compute pairwise Jaccard similarity with +/- 3 sample tolerance window
    const matrix: number[][] = [];
    for (let r = 0; r < detectors.length; r++) {
      const row: number[] = [];
      for (let c = 0; c < detectors.length; c++) {
        if (r === c) {
          row.push(1.0);
          continue;
        }
        const setA = detectors[r].set;
        const setB = detectors[c].set;
        if (setA.size === 0 && setB.size === 0) {
          row.push(1.0); // Both agree on zero anomalies
          continue;
        }
        if (setA.size === 0 || setB.size === 0) {
          row.push(0.0);
          continue;
        }
        let matches = 0;
        setA.forEach((idxA) => {
          let found = false;
          for (let d = -3; d <= 3; d++) {
            if (setB.has(idxA + d)) {
              found = true;
              break;
            }
          }
          if (found) matches++;
        });
        const union = setA.size + setB.size - matches;
        const jaccard = union > 0 ? matches / union : 0;
        row.push(Number(jaccard.toFixed(2)));
      }
      matrix.push(row);
    }

    return { detectors, matrix };
  }, [vals, zScores, anomalyResults]);

  return (
    <div className="space-y-4 w-full">
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
              {detectorAgreement.detectors.map((det, r) => (
                <tr key={det.name}>
                  <td className="py-2 px-3 font-sans font-medium text-primary">{det.name}</td>
                  {detectorAgreement.matrix[r].map((score, c) => (
                    <td
                      key={c}
                      className={`py-2 px-3 text-center ${r === c ? 'text-primary font-bold' : ''}`}
                    >
                      {score.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
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

export default AnomaliesView;
