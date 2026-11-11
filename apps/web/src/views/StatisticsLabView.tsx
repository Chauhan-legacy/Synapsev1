import React, { useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { MeaningTable } from '../components/common/MeaningTable';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';

interface StatisticsLabViewProps {
  onOpenMethodCard: (name: string) => void;
}

export const StatisticsLabView: React.FC<StatisticsLabViewProps> = ({ onOpenMethodCard }) => {
  const { activeSignal, resultsByModule } = useSignal();
  const channelName = activeSignal.channelNames[0];
  const vals = activeSignal.channels[channelName] || [];
  const n = vals.length;

  // Real ACF computation for chart
  const { lags, acfValues } = useMemo(() => {
    const maxLag = 30;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = vals.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n || 1e-6;

    const lagArr: number[] = [];
    const acfArr: number[] = [];

    for (let lag = 0; lag <= maxLag; lag++) {
      lagArr.push(lag);
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        sum += (vals[i] - mean) * (vals[i + lag] - mean);
      }
      acfArr.push(sum / ((n - lag) * variance));
    }

    // Standardized Q-Q plot quantiles
    const sortedVals = [...vals].sort((a, b) => a - b);
    const std = Math.sqrt(variance);
    const nPts = 50;
    const qTheo: number[] = [];
    const qSamp: number[] = [];
    for (let i = 1; i < nPts; i++) {
      const p = i / nPts;
      // Probit approximation for standard normal quantile
      const zTheo = Math.sqrt(2) * (p < 0.5 ? -1 : 1) * Math.sqrt(Math.abs(Math.log(4 * p * (1 - p))));
      const idx = Math.floor(p * sortedVals.length);
      const zSamp = (sortedVals[idx] - mean) / std;
      qTheo.push(zTheo);
      qSamp.push(zSamp);
    }

    return { lags: lagArr, acfValues: acfArr, qqTheoretical: qTheo, qqSample: qSamp };
  }, [vals, n]);

  const statsResults = resultsByModule['statistics'] || [];

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Statistics Intelligence Laboratory</h1>
          <p className="text-xs text-secondary mt-0.5">
            ADF & KPSS joint stationarity, Jarque-Bera normality, and Detrended Fluctuation Analysis (DFA).
          </p>
        </div>
      </div>

      <CollapsibleExplainer title="What am I looking at in the Statistics Lab?">
        The Statistics Lab verifies foundational mathematical assumptions. The joint ADF and KPSS tests diagnose whether
        the process is strictly stationary or driven by unit root drifts. The Autocorrelation Function (ACF) with Ljung-Box test
        determines whether consecutive observations are independent white noise.
      </CollapsibleExplainer>

      {/* Autocorrelation Function Chart */}
      <InteractiveChart
        title="Autocorrelation Function (ACF) with Bartlett 95% Confidence Bounds"
        xValues={lags}
        xLabel="Lag (samples)"
        yLabel="Autocorrelation rho(k)"
        series={[
          { name: 'Sample Autocorrelation ACF', data: acfValues, color: '#2563eb' },
          { name: 'Bartlett 95% Bound (+1.96/√N)', data: lags.map(() => 1.96 / Math.sqrt(n)), color: '#dc2626', dashed: true },
          { name: 'Bartlett 95% Bound (-1.96/√N)', data: lags.map(() => -1.96 / Math.sqrt(n)), color: '#dc2626', dashed: true },
        ]}
        accessibleSummary={`Autocorrelation function across ${lags.length} lags with Bartlett white noise significance bands`}
        height={260}
      />

      <ExportBar title="Statistics Lab" data={statsResults} />

      {/* Results Table with Meaning Column */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Statistical Hypotheses & Distribution Tests
        </h2>
        <MeaningTable results={statsResults} onOpenMethodCard={onOpenMethodCard} />
      </div>
    </div>
  );
};

export default StatisticsLabView;
