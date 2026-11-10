import React, { useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { MeaningTable } from '../components/common/MeaningTable';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { ArrowRight } from 'lucide-react';
import { WorkbenchView } from '../components/shell/Sidebar';

interface OverviewViewProps {
  onOpenMethodCard: (name: string) => void;
  onNavigate: (view: WorkbenchView) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  onOpenMethodCard,
  onNavigate,
}) => {
  const { activeSignal, resultsByModule } = useSignal();

  const channelName = activeSignal.channelNames[0] || 'Channel 1';
  const vals = activeSignal.channels[channelName] || [];
  const times = activeSignal.timestamps || [];
  const n = vals.length;
  const fs = activeSignal.samplingRate;

  // Real summary metrics
  const stats = useMemo(() => {
    if (n === 0) return { mean: 0, std: 0, peak: 0, rms: 0, domFreq: 0 };
    const m = vals.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(vals.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / n) || 1e-6;
    const peak = Math.max(...vals.map(Math.abs));
    const rms = Math.sqrt(vals.reduce((acc, v) => acc + v * v, 0) / n);

    // Simple peak DFT frequency
    const nDft = Math.min(n, 512);
    let maxP = 0;
    let peakBin = 0;
    for (let k = 1; k < nDft / 2; k++) {
      let r = 0, im = 0;
      for (let i = 0; i < nDft; i++) {
        const th = (2 * Math.PI * k * i) / nDft;
        r += (vals[i] - m) * Math.cos(th);
        im -= (vals[i] - m) * Math.sin(th);
      }
      const p = r * r + im * im;
      if (p > maxP) {
        maxP = p;
        peakBin = k;
      }
    }
    const domFreq = (peakBin * fs) / nDft;
    return { mean: m, std: s, peak, rms, domFreq };
  }, [vals, n, fs]);

  // Aggregate results across modules
  const allResults = useMemo(() => {
    return Object.values(resultsByModule).flat();
  }, [resultsByModule]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-base font-bold text-primary">Dataset Overview & Intelligence Brief</h1>
          <p className="text-xs text-secondary mt-0.5">
            Active file: <span className="font-mono text-primary font-medium">{activeSignal.filename}</span> ({n.toLocaleString()} samples, {fs} Hz)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('findings')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold surface-subtle border rounded-md hover:text-primary transition-colors"
          >
            <span>View All Findings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="What am I looking at in the Overview?">
        The Overview presents primary signal metrics, real-time quality diagnostics, and key structural findings.
        Every metric on this screen is computed from the active series. Click "Run analysis" on the top bar to evaluate
        Thomson multitaper line components, ADF/KPSS stationarity regimes, and Rosner ESD transient outliers.
      </CollapsibleExplainer>

      {/* 6 Key Numbers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Dominant Frequency</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{stats.domFreq.toFixed(2)} <span className="text-xs font-normal text-muted">Hz</span></div>
          <div className="text-[10px] text-muted mt-0.5">FFT Peak Bin</div>
        </div>

        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Peak Amplitude</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{stats.peak.toFixed(3)} <span className="text-xs font-normal text-muted">V</span></div>
          <div className="text-[10px] text-muted mt-0.5">Max Absolute Value</div>
        </div>

        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">RMS Energy</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{stats.rms.toFixed(3)} <span className="text-xs font-normal text-muted">RMS</span></div>
          <div className="text-[10px] text-muted mt-0.5">Effective Power</div>
        </div>

        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Standard Deviation</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{stats.std.toFixed(3)} <span className="text-xs font-normal text-muted">σ</span></div>
          <div className="text-[10px] text-muted mt-0.5">Variance Scale</div>
        </div>

        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Sampling Duration</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{(n / fs).toFixed(2)} <span className="text-xs font-normal text-muted">s</span></div>
          <div className="text-[10px] text-muted mt-0.5">Temporal Span</div>
        </div>

        <div className="surface-base border p-3 rounded-md">
          <div className="text-[11px] text-muted">Signal Channels</div>
          <div className="text-lg font-bold font-mono text-primary mt-1">{activeSignal.channelNames.length} <span className="text-xs font-normal text-muted">ch</span></div>
          <div className="text-[10px] text-muted mt-0.5">Synchronous Inputs</div>
        </div>
      </div>

      {/* Main Signal Waveform Chart */}
      <InteractiveChart
        title={`Observed Time Series: ${activeSignal.filename}`}
        xValues={times}
        xLabel="Time (s)"
        yLabel="Amplitude"
        series={[{ name: channelName, data: vals }]}
        accessibleSummary={`Time-domain signal containing ${n} samples at ${fs} Hz`}
        height={240}
      />

      <ExportBar title="Overview" data={allResults} />

      {/* Evaluated Findings Table with Meaning Column */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Evaluated Scientific Findings
        </h2>
        <MeaningTable results={allResults} onOpenMethodCard={onOpenMethodCard} />
      </div>
    </div>
  );
};
