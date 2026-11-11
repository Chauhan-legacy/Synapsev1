import React, { useMemo, useState, useEffect } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { HeartPulse, Brain, Zap, Activity, Play, Pause, Sliders, Sparkles } from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';
import { SignalData } from '../types/signal';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export const BioSignalsLabView: React.FC = () => {
  const { loadCustomSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'eeg' | 'ecg' | 'spikes'>('eeg');

  // Live Oscilloscope Streaming Engine
  const [isLive, setIsLive] = useState<boolean>(true);
  const [liveTick, setLiveTick] = useState<number>(0);

  // EEG Interactive Mental State
  const [eegState, setEegState] = useState<'alpha' | 'theta' | 'beta' | 'delta' | 'gamma'>('alpha');

  // ECG Autonomic Parameters
  const [heartRateBpm, setHeartRateBpm] = useState<number>(72);
  const [vagalTone, setVagalTone] = useState<number>(65); // Parasympathetic RMSSD (ms)
  const [arrhythmia, setArrhythmia] = useState<'normal' | 'rsa' | 'pvc'>('rsa');

  // Spike Sorting Parameters
  const [spikeThresholdSigma, setSpikeThresholdSigma] = useState<number>(4.0);
  const [firingRateHz, setFiringRateHz] = useState<number>(24);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLiveTick((t) => (t + 1) % 100000);
    }, 40);
    return () => clearInterval(interval);
  }, [isLive]);

  // 1. Live EEG Telemetry Synthesis
  const eegData = useMemo(() => {
    const nPts = 120;
    const series = [];

    // Frequency weights based on selected cognitive state
    let dW = 0.1, tW = 0.15, aW = 0.55, bW = 0.15, gW = 0.05;
    if (eegState === 'delta') { dW = 0.70; tW = 0.15; aW = 0.08; bW = 0.05; gW = 0.02; }
    else if (eegState === 'theta') { dW = 0.15; tW = 0.60; aW = 0.15; bW = 0.07; gW = 0.03; }
    else if (eegState === 'beta') { dW = 0.05; tW = 0.10; aW = 0.20; bW = 0.55; gW = 0.10; }
    else if (eegState === 'gamma') { dW = 0.03; tW = 0.07; aW = 0.12; bW = 0.28; gW = 0.50; }

    const phaseOffset = (liveTick * 0.15) % 100;

    for (let i = 0; i < nPts; i++) {
      const t = i * 0.01; // 10 ms step (100 Hz display)
      const tp = t + phaseOffset;

      const delta = Math.sin(2 * Math.PI * 2.0 * tp) * 45 * dW;
      const theta = Math.sin(2 * Math.PI * 6.0 * tp + 0.4) * 30 * tW;
      const alpha = Math.sin(2 * Math.PI * 10.5 * tp + 1.2) * 25 * aW;
      const beta = Math.sin(2 * Math.PI * 22.0 * tp + 2.1) * 15 * bW;
      const gamma = Math.sin(2 * Math.PI * 42.0 * tp) * 10 * gW;
      const noise = (Math.sin(tp * 71.3) * 0.5 + Math.cos(tp * 133.7) * 0.5) * 4;

      const rawUv = delta + theta + alpha + beta + gamma + noise;

      series.push({
        timeMs: Math.round(t * 1000),
        voltageUv: Number(rawUv.toFixed(2)),
        alphaFiltered: Number(alpha.toFixed(2)),
      });
    }

    return {
      series,
      distribution: [
        { name: 'Delta (0.5 - 4 Hz)', pct: dW * 100, color: '#3B82F6', role: 'Deep restorative NREM slow-wave sleep' },
        { name: 'Theta (4 - 8 Hz)', pct: tW * 100, color: '#8B5CF6', role: 'Memory consolidation, creativity & meditation' },
        { name: 'Alpha (8 - 13 Hz)', pct: aW * 100, color: '#0F766E', role: 'Relaxed wakefulness & occipital sensory gating' },
        { name: 'Beta (13 - 30 Hz)', pct: bW * 100, color: '#F59E0B', role: 'Active cognitive focus, problem solving & motor control' },
        { name: 'Gamma (30 - 100 Hz)', pct: gW * 100, color: '#DC2626', role: 'Cortical cross-modal feature binding & perception' },
      ],
      sef95: eegState === 'gamma' ? 58.4 : (eegState === 'beta' ? 26.5 : (eegState === 'alpha' ? 12.8 : (eegState === 'theta' ? 7.6 : 3.8))),
    };
  }, [eegState, liveTick]);

  // 2. Live ECG Cardiac Cycle Synthesis
  const ecgData = useMemo(() => {
    const nPts = 120;
    const series = [];
    const rrNominal = 60000 / heartRateBpm; // ms per beat

    const offset = (liveTick * 15) % (rrNominal * 2);

    for (let i = 0; i < nPts; i++) {
      const tMs = i * 15;
      const beatPhase = ((tMs + offset) % rrNominal) / rrNominal; // 0.0 to 1.0

      // Synthesize authentic P-QRS-T complex
      let mv = 0.0;
      // Baseline baseline wanders slightly
      mv += 0.05 * Math.sin(tMs * 0.003);

      // P wave (atrial depolarization, 0.12 - 0.20)
      if (beatPhase > 0.12 && beatPhase < 0.22) {
        const p = (beatPhase - 0.17) / 0.05;
        mv += 0.18 * Math.exp(-p * p * 3);
      }
      // Q dip (0.24)
      if (beatPhase > 0.23 && beatPhase < 0.26) {
        mv -= 0.15;
      }
      // R spike (ventricular depolarization, 0.27)
      if (beatPhase > 0.25 && beatPhase < 0.31) {
        const r = (beatPhase - 0.28) / 0.02;
        mv += 1.45 * Math.exp(-r * r * 4);
      }
      // S dip (0.32)
      if (beatPhase > 0.30 && beatPhase < 0.34) {
        mv -= 0.35;
      }
      // T wave (ventricular repolarization, 0.42 - 0.60)
      if (beatPhase > 0.42 && beatPhase < 0.60) {
        const tw = (beatPhase - 0.51) / 0.08;
        mv += 0.32 * Math.exp(-tw * tw * 2.5);
      }

      // PVC ectopic spike injection if enabled
      if (arrhythmia === 'pvc' && beatPhase > 0.70 && beatPhase < 0.85) {
        const pvc = (beatPhase - 0.77) / 0.04;
        mv -= 0.95 * Math.exp(-pvc * pvc * 3);
      }

      series.push({
        timeMs: tMs,
        leadII: Number(mv.toFixed(3)),
      });
    }

    // Poincaré RR points
    const poincare = [];
    const baseRR = 60000 / heartRateBpm;
    const sd1 = vagalTone * 0.707;
    const sd2 = vagalTone * 1.8;
    for (let k = 0; k < 60; k++) {
      const u1 = (Math.sin(k * 1.7 + liveTick * 0.05) + Math.cos(k * 3.1)) * 0.5;
      const u2 = (Math.cos(k * 2.3 + liveTick * 0.08) - Math.sin(k * 1.1)) * 0.5;
      const rr1 = baseRR + u1 * sd2 + u2 * sd1;
      const rr2 = baseRR + u1 * sd2 - u2 * sd1;
      poincare.push({ rr_n: Math.round(rr1), rr_next: Math.round(rr2) });
    }

    return { series, poincare, sd1: Math.round(sd1), sd2: Math.round(sd2) };
  }, [heartRateBpm, vagalTone, arrhythmia, liveTick]);

  // 3. Live Neural Spike Sorting Synthesis
  const spikeData = useMemo(() => {
    const nPts = 100;
    const waveforms = [];

    // Canonical pyramidal action potential waveform
    for (let i = 0; i < nPts; i++) {
      const t = (i - 30) * 0.04; // -1.2 ms to +2.8 ms
      // Sodium inward current depolarization followed by potassium repolarization
      const depol = -70 * Math.exp(-Math.pow(t / 0.35, 2));
      const hyperpol = 25 * Math.exp(-Math.pow((t - 0.8) / 0.6, 2));
      const noise = (Math.sin(i * 3.4 + liveTick * 0.2) * 1.5);
      const unit1 = depol + hyperpol + noise;
      const unit2 = (depol * 0.65) + (hyperpol * 0.8) + (Math.cos(i * 2.8) * 1.2);

      waveforms.push({
        timeMs: Number((t).toFixed(2)),
        unit1Uv: Number(unit1.toFixed(1)),
        unit2Uv: Number(unit2.toFixed(1)),
        thresholdUv: -spikeThresholdSigma * 12.5,
      });
    }

    return {
      waveforms,
      quiogaSigma: '12.5 μV',
      detectedRate: `${firingRateHz} Hz`,
      snr: `${(70 / (spikeThresholdSigma * 3.1)).toFixed(1)} dB`,
    };
  }, [spikeThresholdSigma, firingRateHz, liveTick]);

  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  const handleIngestSignal = () => {
    let sigName = '';
    let timestamps: number[] = [];
    let channels: Record<string, number[]> = {};
    let fs = 250;

    if (activeTab === 'eeg') {
      sigName = `EEG_${eegState.toUpperCase()}_Brainwaves_250Hz.csv`;
      timestamps = eegData.series.map((d) => d.timeMs / 1000);
      channels = {
        EEG_Raw_uV: eegData.series.map((d) => d.voltageUv),
        Alpha_Band_uV: eegData.series.map((d) => d.alphaFiltered),
      };
    } else if (activeTab === 'ecg') {
      sigName = `ECG_LeadII_${heartRateBpm}BPM_${arrhythmia}.csv`;
      timestamps = ecgData.series.map((d) => d.timeMs / 1000);
      channels = {
        ECG_Lead_II_mV: ecgData.series.map((d) => d.leadII),
      };
      fs = 200;
    } else {
      sigName = `Neural_Spikes_Poisson_${firingRateHz}Hz.csv`;
      timestamps = spikeData.waveforms.map((d) => d.timeMs / 1000);
      channels = {
        Extracellular_uV: spikeData.waveforms.map((d) => d.unit1Uv),
      };
      fs = 1000;
    }

    const sig: SignalData = {
      id: `bio-${activeTab}-${Date.now()}`,
      filename: sigName,
      samplingRate: fs,
      timestamps,
      channelNames: Object.keys(channels),
      channels,
      duration: Math.max(1, timestamps[timestamps.length - 1] - timestamps[0]),
      quality: {
        total_samples: timestamps.length,
        channel_count: Object.keys(channels).length,
        sampling_rate: fs,
        is_uniform: true,
        timestamp_jitter_pct: 0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: `biosignal-${activeTab}-hash`,
        warnings: [],
      },
    };

    loadCustomSignal(sig);
    setIngestNotice(`Ingested ${sigName} into SYNAPSE Workbench.`);
    setTimeout(() => setIngestNotice(null), 3500);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] animate-pulse" />
            <h1 className="text-base font-bold text-[#1F2430]">Bio &amp; Neuro Signals Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0F766E]/15 text-[#0F766E] font-bold">
              Dimension 1 Intelligence • Live Oscilloscope
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Real-time electrophysiological discovery: EEG brainwave spectral decomposition, cardiac autonomic HRV geometry, and extracellular neural action potential spike sorting.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2">
          {ingestNotice && (
            <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2.5 py-1 rounded border border-[#0F766E]/30 animate-pulse font-bold">
              {ingestNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleIngestSignal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-mono font-bold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
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
            <span>Neural Action Potentials</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does SYNAPSE model biological electrophysiology?">
        EEG captures macroscopic post-synaptic dendritic currents across neocortical pyramidal populations.
        ECG Lead-II records ventricular depolarization vectors (QRS) and evaluates parasympathetic (vagal) tone via high-frequency RR intervals.
        Extracellular microelectrodes record microscopic action potential transients isolated using non-parametric Quiroga noise thresholds:
        <div className="my-2">
          <MathFormula formula="\sigma_n = \text{median}\left(\frac{|x|}{0.6745}\right), \quad V_{\text{thresh}} = 4.0 \times \sigma_n" displayMode={true} />
        </div>
      </CollapsibleExplainer>

      {/* Live Stream Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2 rounded-xl border border-[#DDD6C7] bg-[#FAF8F5] font-mono text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-[#0F766E] animate-pulse' : 'bg-[#9CA3AF]'}`} />
          <span className="font-bold text-[#1F2430]">
            {isLive ? 'CONTINUOUS BIO-TELEMETRY STREAM ACTIVE' : 'STREAM PAUSED'}
          </span>
          <span className="text-[10px] text-[#78716C] ml-2">Sampling Rate: 250 Hz • Digital High-Pass 0.5 Hz</span>
        </div>

        <button
          type="button"
          onClick={() => setIsLive((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-colors ${
            isLive
              ? 'bg-[#EFEBE0] text-[#1F2430] hover:bg-[#E2DDD2] border border-[#DDD6C7]'
              : 'bg-[#0F766E] text-white hover:bg-[#0D655E]'
          }`}
        >
          {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isLive ? 'Pause Stream' : 'Resume Live'}</span>
        </button>
      </div>

      {/* TAB 1: EEG BRAINWAVES */}
      {activeTab === 'eeg' && (
        <div className="space-y-4 font-mono">
          {/* Cognitive State Selector */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-3 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1F2430]">Select Cognitive / Neurological State:</span>
              <span className="text-[#0F766E] font-bold">Spectral Edge Frequency: SEF95 = {eegData.sef95} Hz</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {[
                { id: 'delta', label: 'Slow Delta (Sleep)', desc: '0.5 - 4 Hz' },
                { id: 'theta', label: 'Theta (Meditation)', desc: '4 - 8 Hz' },
                { id: 'alpha', label: 'Relaxed Alpha', desc: '8 - 13 Hz' },
                { id: 'beta', label: 'Active Beta (Focus)', desc: '13 - 30 Hz' },
                { id: 'gamma', label: 'Gamma (Perception)', desc: '30 - 100 Hz' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setEegState(st.id as any)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    eegState === st.id
                      ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-2xs font-bold'
                      : 'bg-[#FAF8F5] border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
                  }`}
                >
                  <div className="font-bold">{st.label}</div>
                  <div className="text-[10px] opacity-75">{st.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Live EEG Waveform Chart */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0F766E]" />
                <span className="font-bold text-[#1F2430]">Live Cortical Oscilloscope [Lead Fz-Cz • 0.5 - 100 Hz]</span>
              </div>
              <span className="text-[10px] text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                Current Dominant: {eegState.toUpperCase()} Band
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={eegData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" ms" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} domain={[-80, 80]} unit=" μV" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine y={0} stroke="#DDD6C7" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="voltageUv" stroke="#0F766E" strokeWidth={1.75} dot={false} name="Raw EEG (μV)" />
                  <Line type="monotone" dataKey="alphaFiltered" stroke="#B45F1B" strokeWidth={1.25} strokeDasharray="2 2" dot={false} name="Filtered Rhythm" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EEG Power Distribution */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-3 text-xs">
            <div className="font-bold text-[#1F2430] border-b border-[#DDD6C7] pb-2">
              Welch Multitaper Spectral Power Breakdown
            </div>
            <div className="space-y-2.5">
              {eegData.distribution.map((b) => (
                <div key={b.name} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#1F2430]">{b.name}</span>
                    <span className="font-bold text-[#0F766E]">{b.pct.toFixed(1)}% Power</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#EFEBE0] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                      className="h-full rounded-full transition-all duration-300"
                    />
                  </div>
                  <div className="text-[10px] text-[#78716C]">{b.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ECG HRV */}
      {activeTab === 'ecg' && (
        <div className="space-y-4 font-mono">
          {/* Cardiac Rhythm Controls */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#1F2430] border-b border-[#DDD6C7] pb-2">
              <Sliders className="w-4 h-4 text-[#DC2626]" />
              <span>Autonomic &amp; Cardiac Rhythm Modulators</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6F7B]">Heart Rate:</span>
                  <span className="font-bold text-[#DC2626]">{heartRateBpm} BPM</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="160"
                  step="1"
                  value={heartRateBpm}
                  onChange={(e) => setHeartRateBpm(parseInt(e.target.value))}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6F7B]">Vagal Tone (RMSSD):</span>
                  <span className="font-bold text-[#0F766E]">{vagalTone} ms</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={vagalTone}
                  onChange={(e) => setVagalTone(parseInt(e.target.value))}
                  className="w-full accent-[#0F766E] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6F7B]">Arrhythmia Mode:</span>
                  <span className="font-bold text-[#1F2430] uppercase">{arrhythmia}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  {(['normal', 'rsa', 'pvc'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setArrhythmia(mode)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors flex-1 ${
                        arrhythmia === mode
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#57534E]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live ECG Waveform */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#DC2626]" />
                <span className="font-bold text-[#1F2430]">Live Lead-II ECG Rhythm Strip [P-QRS-T Vector]</span>
              </div>
              <span className="text-[10px] text-[#DC2626] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Cardiac Period RR = {Math.round(60000 / heartRateBpm)} ms
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={ecgData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" ms" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} domain={[-0.8, 1.8]} unit=" mV" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine y={0} stroke="#DDD6C7" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="leadII" stroke="#DC2626" strokeWidth={2} dot={false} name="Lead II (mV)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2D Poincaré HRV Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#DDD6C7] pb-2">
              <span className="font-bold text-[#1F2430]">2D Poincaré Geometry [RR_n vs RR_{`{n+1}`}]</span>
              <span className="text-[11px] text-[#0F766E] font-bold">SD1 (Vagal) = {ecgData.sd1} ms • SD2 (Sympathetic) = {ecgData.sd2} ms</span>
            </div>

            <div className="h-56 w-full bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg relative flex items-center justify-center p-2">
              <svg className="w-full h-full" viewBox="400 400 600 600">
                {/* Diagonal line of identity */}
                <line x1="400" y1="400" x2="1000" y2="1000" stroke="#DDD6C7" strokeDasharray="4 4" strokeWidth="2" />
                {/* Points */}
                {ecgData.poincare.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.rr_n}
                    cy={pt.rr_next}
                    r={4}
                    fill="#0F766E"
                    fillOpacity={0.75}
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NEURAL SPIKES */}
      {activeTab === 'spikes' && (
        <div className="space-y-4 font-mono text-xs">
          {/* Spike Sorter Controls */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-[#1F2430] border-b border-[#DDD6C7] pb-2">
              <Zap className="w-4 h-4 text-[#B45F1B]" />
              <span>Extracellular Microelectrode Spike Sorter Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6F7B]">Quiroga Robust Threshold (σ_n):</span>
                  <span className="font-bold text-[#0F766E]">{spikeThresholdSigma.toFixed(1)} σ</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="6.0"
                  step="0.5"
                  value={spikeThresholdSigma}
                  onChange={(e) => setSpikeThresholdSigma(parseFloat(e.target.value))}
                  className="w-full accent-[#0F766E] cursor-pointer"
                />
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#DDD6C7] rounded-lg space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6F7B]">Firing Rate:</span>
                  <span className="font-bold text-[#B45F1B]">{firingRateHz} Hz (Poisson)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="2"
                  value={firingRateHz}
                  onChange={(e) => setFiringRateHz(parseInt(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Action Potential Waveform Overlay */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] p-4 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1F2430]">Overlaid Extracellular Action Potential Waveforms</span>
              <span className="text-[10px] text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                SNR: {spikeData.snr} • Noise σ_n: {spikeData.quiogaSigma}
              </span>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={spikeData.waveforms} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" ms" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" μV" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine y={-spikeThresholdSigma * 12.5} stroke="#DC2626" strokeDasharray="3 3" label={{ value: `Detection Threshold (-${(spikeThresholdSigma * 12.5).toFixed(0)} μV)`, fill: '#DC2626', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Line type="monotone" dataKey="unit1Uv" stroke="#0F766E" strokeWidth={2.2} dot={false} name="Pyramidal Unit 1 (μV)" />
                  <Line type="monotone" dataKey="unit2Uv" stroke="#B45F1B" strokeWidth={1.5} dot={false} name="Interneuron Unit 2 (μV)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <ExportBar title="Bio-Signals Lab" data={{ tab: activeTab, eegState, heartRateBpm }} />
    </div>
  );
};

export default BioSignalsLabView;
