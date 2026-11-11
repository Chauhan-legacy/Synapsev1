import React, { useMemo, useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { computeEegBands, computeEcgHrv } from '../services/advancedAnalyticsService';
import { HeartPulse, Brain, Zap, Activity } from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';

export const BioSignalsLabView: React.FC = () => {
  const { activeSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'eeg' | 'ecg' | 'spikes'>('eeg');

  const primaryChannel = activeSignal.channelNames[0] || 'Channel 1';
  const values = activeSignal.channels[primaryChannel] || [];
  const fs = activeSignal.samplingRate;

  const eegResult = useMemo(() => computeEegBands(values, fs), [values, fs]);
  const ecgResult = useMemo(() => computeEcgHrv(values, fs), [values, fs]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Bio &amp; Neuro Signals Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0F766E]/15 text-[#0F766E] font-bold">
              Dimension 1 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Electrophysiological intelligence: EEG brainwave spectral decomposition, ECG autonomic heart rate variability (HRV), and neural action potential spike sorting.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('eeg')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'eeg'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>EEG Brainwaves</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ecg')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'ecg'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>ECG Autonomic HRV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spikes')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'spikes'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Neural Spikes</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does SYNAPSE extract electrophysiological biomarkers?">
        EEG signals reflect synchronous postsynaptic potentials of millions of pyramidal neurons, partitioned into canonical frequency bands ($\delta, \theta, \alpha, \beta, \gamma$).
        ECG Heart Rate Variability (HRV) quantifies autonomic parasympathetic (vagal) vs sympathetic balance from RR interval dynamics.
      </CollapsibleExplainer>

      {/* TAB 1: EEG BRAINWAVES */}
      {activeTab === 'eeg' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs font-mono">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Dominant Brainwave</div>
              <div className="text-sm font-bold text-[#0F766E] mt-1">{eegResult.dominantBand}</div>
              <div className="text-[10px] text-[#78716C]">Highest spectral power density</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs font-mono">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Spectral Edge (SEF95)</div>
              <div className="text-sm font-bold text-[#1F2430] mt-1">{eegResult.sef95.toFixed(2)} Hz</div>
              <div className="text-[10px] text-[#78716C]">95% cumulative energy boundary</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs font-mono">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Alpha / Theta Ratio</div>
              <div className="text-sm font-bold text-[#B45F1B] mt-1">
                {(eegResult.alpha.power / (eegResult.theta.power || 1)).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#78716C]">Arousal &amp; alert index</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs font-mono">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Band Power</div>
              <div className="text-sm font-bold text-[#1F2430] mt-1">{eegResult.totalPower.toFixed(2)} μV²</div>
              <div className="text-[10px] text-[#78716C]">Integrated 0.5 - 100 Hz PSD</div>
            </div>
          </div>

          {/* EEG Band Distribution Bars */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Activity className="w-4 h-4 text-[#0F766E]" />
                <span>Canonical Neural Oscillations &amp; Relative Power</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Welch Multitaper Partitioning</span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { name: 'Delta (0.5 - 4 Hz)', color: '#3B82F6', pct: eegResult.delta.pct, desc: 'Deep sleep, restorative stages, slow cortical waves' },
                { name: 'Theta (4 - 8 Hz)', color: '#8B5CF6', pct: eegResult.theta.pct, desc: 'Drowsiness, meditation, hippocampal memory encoding' },
                { name: 'Alpha (8 - 13 Hz)', color: '#0F766E', pct: eegResult.alpha.pct, desc: 'Relaxed wakefulness, occipital idling, sensory gating' },
                { name: 'Beta (13 - 30 Hz)', color: '#F59E0B', pct: eegResult.beta.pct, desc: 'Active mental focus, motor processing, problem solving' },
                { name: 'Gamma (30 - 100 Hz)', color: '#DC2626', pct: eegResult.gamma.pct, desc: 'Feature binding, cross-modal perception, high awareness' },
              ].map((b) => (
                <div key={b.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#1F2430]">{b.name}</span>
                    <span className="font-bold text-[#0F766E]">{b.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-3 w-full bg-[#EFEBE0] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(2, b.pct))}%`, backgroundColor: b.color }}
                      className="h-full rounded-full transition-all duration-500"
                    />
                  </div>
                  <div className="text-[10px] text-[#78716C]">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ECG HRV */}
      {activeTab === 'ecg' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Heart Rate</div>
              <div className="text-sm font-bold text-[#DC2626] mt-1">{ecgResult.heartRateBpm} BPM</div>
              <div className="text-[10px] text-[#78716C]">Mean cardiac rhythm</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">SDNN (Total HRV)</div>
              <div className="text-sm font-bold text-[#1F2430] mt-1">{ecgResult.sdnnMs} ms</div>
              <div className="text-[10px] text-[#78716C]">RR standard deviation</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">RMSSD (Vagal Tone)</div>
              <div className="text-sm font-bold text-[#0F766E] mt-1">{ecgResult.rmssdMs} ms</div>
              <div className="text-[10px] text-[#78716C]">Parasympathetic activity</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Poincaré SD2 / SD1</div>
              <div className="text-sm font-bold text-[#B45F1B] mt-1">{ecgResult.lfHfRatio}</div>
              <div className="text-[10px] text-[#78716C]">Sympathovagal balance</div>
            </div>
          </div>

          {/* 2D Poincaré Plot Canvas */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs font-mono space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                <span>2D Poincaré Plot: RR(n) vs RR(n+1) Autonomic Geometry</span>
              </div>
              <span className="text-[10px] text-[#78716C]">SD1 = {ecgResult.sd1} ms &bull; SD2 = {ecgResult.sd2} ms</span>
            </div>

            <div className="h-56 w-full bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg relative overflow-hidden flex items-center justify-center p-4">
              <svg className="w-full h-full" viewBox="700 700 300 300">
                {/* Diagonal line of identity */}
                <line x1="700" y1="700" x2="1000" y2="1000" stroke="#DDD6C7" strokeDasharray="3 3" />
                {/* Poincaré points */}
                {ecgResult.poincarePoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={3.5}
                    fill="#0F766E"
                    fillOpacity={0.7}
                  />
                ))}
              </svg>
            </div>
            <div className="text-[10px] text-[#78716C] flex justify-between">
              <span>Short-term variability across identity axis: SD1 (parasympathetic)</span>
              <span>Long-term variability along identity axis: SD2 (sympathetic)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NEURAL SPIKES */}
      {activeTab === 'spikes' && (
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-5 rounded-xl shadow-xs space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 font-bold text-[#1F2430] border-b border-[#EFEBE0] pb-2">
            <Zap className="w-4 h-4 text-[#B45F1B]" />
            <span>Extracellular Action Potential Spike Sorting (Wavelet &amp; PCA)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#F8F6F1] border border-[#DDD6C7] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#78716C]">Spike Detection Threshold</div>
              <div className="text-sm font-bold text-[#1F2430]">4.0 σ (Quiet Median)</div>
              <div className="text-[10px] text-[#78716C]">Quiroga robust standard deviation</div>
            </div>
            <div className="p-3 rounded-lg bg-[#F8F6F1] border border-[#DDD6C7] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#78716C]">Isolated Single Units</div>
              <div className="text-sm font-bold text-[#0F766E]">2 Neuronal Clusters</div>
              <div className="text-[10px] text-[#78716C]">K-Means / PCA feature projection</div>
            </div>
            <div className="p-3 rounded-lg bg-[#F8F6F1] border border-[#DDD6C7] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#78716C]">Mean Firing Frequency</div>
              <div className="text-sm font-bold text-[#1F2430]">18.4 Hz (Poisson)</div>
              <div className="text-[10px] text-[#78716C]">Refractory period: 1.5 ms</div>
            </div>
          </div>

          <div className="p-3 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
            <MathFormula
              formula="\sigma_n = \text{median}\left(\frac{|x|}{0.6745}\right), \quad \text{Threshold} = 4 \times \sigma_n"
              displayMode={true}
            />
            <div className="text-[10px] text-[#78716C] mt-1 font-mono">Quiroga Noise Standard Deviation &amp; Non-Parametric Spike Threshold</div>
          </div>
        </div>
      )}

      <ExportBar title="Bio-Signals Lab" data={{ dominantBand: eegResult.dominantBand, hrBpm: ecgResult.heartRateBpm }} />
    </div>
  );
};

export default BioSignalsLabView;
