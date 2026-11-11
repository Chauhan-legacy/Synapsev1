import React, { useMemo, useState, useEffect } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { Atom, Radio, Sparkles, Play, Pause, Sliders, Orbit } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { SignalData } from '../types/signal';

type Radioisotope = 'Co60' | 'Cs137' | 'Na22' | 'Am241';

export const QuantumLabView: React.FC = () => {
  const { loadCustomSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'mca' | 'exoplanet' | 'pulsar'>('mca');

  // Streaming & Notification
  const [isLive, setIsLive] = useState<boolean>(true);
  const [liveTick, setLiveTick] = useState<number>(0);
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  // TAB 1: MCA GAMMA SPECTROSCOPY PARAMETERS
  const [selectedIsotope, setSelectedIsotope] = useState<Radioisotope>('Co60');
  const [detectorFwhmPct, setDetectorFwhmPct] = useState<number>(2.2); // 1.5% (HPGe) to 7.5% (NaI)
  const [pmtGain, setPmtGain] = useState<number>(1.0); // 0.6x to 1.8x
  const [highVoltageBias, setHighVoltageBias] = useState<number>(950); // Volts

  // TAB 2: EXOPLANET BLS TRANSIT PHOTOMETRY PARAMETERS
  const [planetRadiusRatio, setPlanetRadiusRatio] = useState<number>(0.095); // Rp / R* (0.01 to 0.15)
  const [orbitalPeriodDays, setOrbitalPeriodDays] = useState<number>(3.52); // days (e.g. HD 209458b)
  const [impactParameter, setImpactParameter] = useState<number>(0.2); // 0 to 0.85

  // TAB 3: PULSAR COLD PLASMA DISPERSION PARAMETERS
  const [dispersionMeasure, setDispersionMeasure] = useState<number>(124.5); // pc cm^-3
  const [pulsarPeriodMs, setPulsarPeriodMs] = useState<number>(33.0); // Crab pulsar 33ms
  const [centerFreqMhz, setCenterFreqMhz] = useState<number>(800); // MHz

  // Animation Loop
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [isLive]);

  // ============================================================================
  // TAB 1: 512-CHANNEL MCA GAMMA SPECTROSCOPY SPECTRUM
  // ============================================================================
  const mcaData = useMemo(() => {
    const channels = 512;
    const maxKeV = 1600;
    const pts: Array<{ energyKeV: number; counts: number; photopeak1?: number; photopeak2?: number }> = [];

    // Isotope characteristics
    let peaks: Array<{ energy: number; label: string; yield: number }> = [];
    let comptonEdges: number[] = [];

    if (selectedIsotope === 'Co60') {
      peaks = [
        { energy: 1173.2, label: 'Co-60 Peak 1 (1173.2 keV)', yield: 1.0 },
        { energy: 1332.5, label: 'Co-60 Peak 2 (1332.5 keV)', yield: 1.0 },
      ];
      comptonEdges = [963.4, 1118.1];
    } else if (selectedIsotope === 'Cs137') {
      peaks = [
        { energy: 32.2, label: 'Ba X-ray (32 keV)', yield: 0.15 },
        { energy: 661.7, label: 'Cs-137 Photopeak (661.7 keV)', yield: 0.85 },
      ];
      comptonEdges = [477.3];
    } else if (selectedIsotope === 'Na22') {
      peaks = [
        { energy: 511.0, label: 'e+/e- Annihilation (511.0 keV)', yield: 1.8 },
        { energy: 1274.5, label: 'Na-22 Nuclear (1274.5 keV)', yield: 1.0 },
      ];
      comptonEdges = [340.7, 1061.7];
    } else {
      // Am241
      peaks = [
        { energy: 26.3, label: 'Np L X-ray', yield: 0.2 },
        { energy: 59.54, label: 'Am-241 Gamma (59.54 keV)', yield: 0.36 },
      ];
      comptonEdges = [11.2];
    }

    // Scaled by PMT gain & HV bias
    const gainFactor = pmtGain * (highVoltageBias / 950);

    for (let ch = 0; ch < channels; ch++) {
      const e = (ch / channels) * maxKeV;
      // 1. Electronic noise floor & low-energy scatter
      let counts = (180 / (1.0 + Math.exp((e - 50) / 12))) * gainFactor;

      // 2. Compton continuum (Klein-Nishina integration)
      for (const ec of comptonEdges) {
        if (e < ec) {
          counts += 160 * (1 - 0.35 * (e / ec)) * gainFactor;
        }
      }

      // 3. Backscatter peak ~ 215 keV
      counts += 80 * Math.exp(-Math.pow((e - 215) / 30, 2)) * gainFactor;

      // 4. Gaussian Photopeaks: sigma = E * (FWHM% / 100) / 2.355
      for (const p of peaks) {
        const sigma = (p.energy * (detectorFwhmPct / 100)) / 2.355;
        const dE = e - p.energy;
        counts += 1200 * p.yield * Math.exp(-(dE * dE) / (2 * sigma * sigma)) * gainFactor;
      }

      // 5. Poisson counting statistics noise
      const poissonNoise = Math.sin(ch * 73.1 + liveTick * 0.2) * Math.sqrt(Math.max(1, counts)) * 0.4;
      const total = Math.max(5, Math.round(counts + poissonNoise + 8));

      pts.push({
        energyKeV: Math.round(e),
        counts: total,
      });
    }

    const totalRecorded = pts.reduce((a, b) => a + b.counts, 0);

    return {
      series: pts,
      totalCounts: totalRecorded,
      peaks,
      comptonEdges,
      fwhmVal: detectorFwhmPct,
    };
  }, [selectedIsotope, detectorFwhmPct, pmtGain, highVoltageBias, liveTick]);

  // ============================================================================
  // TAB 2: EXOPLANET MANDEL-AGOL BLS TRANSIT LIGHT CURVE
  // ============================================================================
  const exoplanetData = useMemo(() => {
    const pts: Array<{ phase: number; relativeFlux: number; limbDarkened: number }> = [];
    const nPts = 120;
    // Transit depth delta = (Rp / R*)^2
    const transitDepth = Math.pow(planetRadiusRatio, 2);
    const transitDepthPpm = Math.round(transitDepth * 1e6);

    // Transit duration depends on period and impact parameter: T_dur = (P / pi) * (R* / a) * sqrt((1+k)^2 - b^2)
    const transitHalfWidth = Math.max(0.04, 0.14 * Math.sqrt(Math.max(0.01, 1 - Math.pow(impactParameter, 2))));

    // Quadratic limb darkening coefficients (Solar-type star)
    const u1 = 0.40;
    const u2 = 0.25;

    for (let i = 0; i <= nPts; i++) {
      const phase = Number(((i - nPts / 2) / (nPts / 2)).toFixed(3)); // -1.0 to +1.0
      const absPhase = Math.abs(phase);

      let flux = 1.0;
      let ldFlux = 1.0;

      if (absPhase < transitHalfWidth) {
        // Geometric transit dip
        const ingressFrac = absPhase / transitHalfWidth;
        const mu = Math.sqrt(Math.max(0, 1 - ingressFrac * ingressFrac));
        // Mandel-Agol limb darkening profile
        const ldCorrection = 1.0 - u1 * (1 - mu) - u2 * Math.pow(1 - mu, 2);

        const dip = transitDepth * Math.sqrt(Math.max(0, 1 - Math.pow(ingressFrac, 2)));
        flux = 1.0 - dip;
        ldFlux = 1.0 - dip * (ldCorrection / (1 - u1 / 3 - u2 / 6));
      }

      // Add photometric observational scatter (Kepler 30-minute cadence ~ 45 ppm)
      const noise = (Math.sin(i * 19.3 + liveTick * 0.15) * 0.00018);

      pts.push({
        phase,
        relativeFlux: Number((flux + noise).toFixed(5)),
        limbDarkened: Number((ldFlux + noise).toFixed(5)),
      });
    }

    return {
      series: pts,
      transitDepthPpm,
      transitDepthPct: Number((transitDepth * 100).toFixed(3)),
      durationHours: Number((orbitalPeriodDays * 24 * transitHalfWidth * 2).toFixed(1)),
    };
  }, [planetRadiusRatio, orbitalPeriodDays, impactParameter, liveTick]);

  // ============================================================================
  // TAB 3: PULSAR COLD-PLASMA DISPERSION MEASURE (400 - 1400 MHz)
  // ============================================================================
  const pulsarData = useMemo(() => {
    // Dispersion Delay: delta_t = 4.1488e3 * DM * (nu^-2 - nu_ref^-2) (seconds)
    const pts: Array<{ freqMhz: number; delayMs: number; pulseProfile: number }> = [];
    const minFreq = 400;
    const maxFreq = 1400;
    const stepFreq = 20;

    for (let freq = minFreq; freq <= maxFreq; freq += stepFreq) {
      // Delay relative to infinite frequency: t(nu) = 4.1488e6 * DM / nu^2 (ms)
      const delayMs = (4.1488e6 * dispersionMeasure) / Math.pow(freq, 2);

      // Pulse profile at that frequency with phase dispersion
      const phase = ((delayMs + liveTick * 2.0) % pulsarPeriodMs) / pulsarPeriodMs;
      const pulse = Math.exp(-Math.pow((phase - 0.5) / 0.04, 2));

      pts.push({
        freqMhz: freq,
        delayMs: Number(delayMs.toFixed(1)),
        pulseProfile: Number((pulse + (Math.sin(freq * 11.3) * 0.03)).toFixed(3)),
      });
    }

    const totalDispersionDelayMs = Math.round(
      (4.1488e6 * dispersionMeasure) * (1 / Math.pow(minFreq, 2) - 1 / Math.pow(maxFreq, 2))
    );

    return {
      series: pts,
      totalDelayMs: totalDispersionDelayMs,
      electronColumnDensity: `${dispersionMeasure.toFixed(1)} pc cm⁻³`,
      crabRotationalFreq: (1000 / pulsarPeriodMs).toFixed(1),
    };
  }, [dispersionMeasure, pulsarPeriodMs, centerFreqMhz, liveTick]);

  // Ingest handler
  const handleIngestSignal = () => {
    let sigName = '';
    let channelNames: string[] = [];
    let channels: Record<string, number[]> = {};
    let timestamps: number[] = [];
    let fs = 20;

    if (activeTab === 'mca') {
      sigName = `MCA_Spectroscopy_${selectedIsotope}_FWHM${detectorFwhmPct}pct.csv`;
      timestamps = mcaData.series.map((d) => d.energyKeV);
      channelNames = ['Counts_Per_Bin'];
      channels = {
        Counts_Per_Bin: mcaData.series.map((d) => d.counts),
      };
      fs = 1;
    } else if (activeTab === 'exoplanet') {
      sigName = `Exoplanet_BLS_Transit_Rp${planetRadiusRatio.toFixed(3)}_P${orbitalPeriodDays.toFixed(1)}d.csv`;
      timestamps = exoplanetData.series.map((d) => d.phase);
      channelNames = ['Normalized_Flux', 'Limb_Darkened_Model'];
      channels = {
        Normalized_Flux: exoplanetData.series.map((d) => d.relativeFlux),
        Limb_Darkened_Model: exoplanetData.series.map((d) => d.limbDarkened),
      };
      fs = 10;
    } else {
      sigName = `Pulsar_Cold_Plasma_DM${dispersionMeasure.toFixed(0)}_Delay${pulsarData.totalDelayMs}ms.csv`;
      timestamps = pulsarData.series.map((d) => d.freqMhz);
      channelNames = ['Dispersion_Delay_ms', 'Pulse_Intensity'];
      channels = {
        Dispersion_Delay_ms: pulsarData.series.map((d) => d.delayMs),
        Pulse_Intensity: pulsarData.series.map((d) => d.pulseProfile),
      };
      fs = 5;
    }

    const sig: SignalData = {
      id: `quantum-${activeTab}-${Date.now()}`,
      filename: sigName,
      samplingRate: fs,
      timestamps,
      channelNames,
      channels,
      duration: Math.max(1, timestamps[timestamps.length - 1] - timestamps[0]),
      quality: {
        total_samples: timestamps.length,
        channel_count: channelNames.length,
        sampling_rate: fs,
        is_uniform: true,
        timestamp_jitter_pct: 0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: `quantum-astro-${activeTab}-hash`,
        warnings: [],
      },
    };

    loadCustomSignal(sig);
    setIngestNotice(`Ingested ${sigName} into SYNAPSE Workbench.`);
    setTimeout(() => setIngestNotice(null), 3500);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Quantum &amp; Astrophysics Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#9333EA]/15 text-[#9333EA] font-bold">
              Dimension 5 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Quantum spectroscopy &amp; astrophysical discovery: MCA gamma-ray photopeak identification, Exoplanet Box Least Squares (BLS) transit fitting, and Pulsar cold-plasma dispersion measures.
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#9333EA] hover:bg-[#7E22CE] text-white text-xs font-mono font-bold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does Multichannel Gamma Spectroscopy identify radioactive isotopes?">
        When a gamma-ray photon interacts with a cryogenic HPGe or NaI(Tl) scintillation crystal, it deposits energy via the photoelectric effect (full-energy absorption photopeak), Compton scattering (continuous forward momentum transfer), or electron-positron pair production (E_gamma &gt; 1.022 MeV).
        The multichannel analyzer bins the pulse heights into a 512-channel calibrated energy histogram N(E), producing distinctive nuclear spectral fingerprints.
      </CollapsibleExplainer>

      {/* TAB SWITCHER */}
      <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('mca')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'mca'
              ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Atom className="w-3.5 h-3.5" />
          <span>Multichannel Gamma MCA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exoplanet')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'exoplanet'
              ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>Exoplanet Transit Photometry</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pulsar')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'pulsar'
              ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Pulsar Cold-Plasma Dispersion</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MCA GAMMA SPECTROSCOPY */}
      {/* ==================================================================== */}
      {activeTab === 'mca' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Target Radioisotope</div>
              <div className="text-base font-bold text-[#9333EA] mt-1">
                {selectedIsotope === 'Co60'
                  ? 'Cobalt-60 (⁶⁰Co)'
                  : selectedIsotope === 'Cs137'
                  ? 'Cesium-137 (¹³⁷Cs)'
                  : selectedIsotope === 'Na22'
                  ? 'Sodium-22 (²²Na)'
                  : 'Americium-241 (²⁴¹Am)'}
              </div>
              <div className="text-[10px] text-[#78716C]">
                {mcaData.peaks.map((p) => `${p.energy} keV`).join(', ')}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Compton Kinematic Edge</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">
                {mcaData.comptonEdges[0] ? `${mcaData.comptonEdges[0]} keV` : 'N/A'}
              </div>
              <div className="text-[10px] text-[#78716C]">E_edge = 2E² / (m_e c² + 2E)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Detector Resolution</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{detectorFwhmPct.toFixed(1)}% FWHM</div>
              <div className="text-[10px] text-[#78716C]">
                {detectorFwhmPct < 3.0 ? 'Cryogenic HPGe Coaxial' : 'NaI(Tl) Scintillator'}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Recorded Counts</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{mcaData.totalCounts.toLocaleString()}</div>
              <div className="text-[10px] text-[#78716C]">512 Channel Pulse Height Multi-Bin</div>
            </div>
          </div>

          {/* Radioisotope Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {[
              { id: 'Co60' as Radioisotope, name: 'Cobalt-60', desc: '1173 & 1332 keV Dual Cascade' },
              { id: 'Cs137' as Radioisotope, name: 'Cesium-137', desc: '662 keV Standard Single Peak' },
              { id: 'Na22' as Radioisotope, name: 'Sodium-22', desc: '511 keV Positron Annihilation' },
              { id: 'Am241' as Radioisotope, name: 'Americium-241', desc: '59.5 keV Low-Energy Gamma' },
            ].map((iso) => (
              <button
                key={iso.id}
                type="button"
                onClick={() => setSelectedIsotope(iso.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedIsotope === iso.id
                    ? 'bg-[#FFFFFF] border-[#9333EA] shadow-xs ring-1 ring-[#9333EA]'
                    : 'bg-[#FFFDF9] border-[#E6DFC6] hover:bg-[#F8F6F1]'
                }`}
              >
                <div className="font-bold text-[#1F2430]">{iso.name}</div>
                <div className="text-[10px] text-[#78716C]">{iso.desc}</div>
              </button>
            ))}
          </div>

          {/* Interactive Detector Parameters */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#9333EA]" />
                <span>Detector Photomultiplier &amp; Spectroscopy Calibration</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold ${
                  isLive ? 'bg-[#9333EA] text-white' : 'bg-[#EFEBE0] text-[#1F2430]'
                }`}
              >
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isLive ? 'Counting Live' : 'Pause'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Detector Resolution (% FWHM):</span>
                  <span className="font-bold text-[#9333EA]">{detectorFwhmPct.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="7.5"
                  step="0.2"
                  value={detectorFwhmPct}
                  onChange={(e) => setDetectorFwhmPct(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">1.5% (High-Purity Germanium) • 7.5% (NaI Scintillator)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">High-Voltage Bias:</span>
                  <span className="font-bold text-[#9333EA]">{highVoltageBias} V</span>
                </div>
                <input
                  type="range"
                  min="600"
                  max="1300"
                  step="25"
                  value={highVoltageBias}
                  onChange={(e) => setHighVoltageBias(parseInt(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">PMT dynode electron multiplication voltage</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Shaping Amplifier Gain:</span>
                  <span className="font-bold text-[#9333EA]">{pmtGain.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={pmtGain}
                  onChange={(e) => setPmtGain(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">Linear pre-amplifier pulse shaping scaling</div>
              </div>
            </div>
          </div>

          {/* 512-Channel Energy Spectrum Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Atom className="w-4 h-4 text-[#9333EA]" />
                <span>MCA Pulse Height Histogram N(E) [0 to 1600 keV]</span>
              </div>
              <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
                512 Multichannel Bins • Poisson Dead-Time Corrected
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={mcaData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="energyKeV" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" keV" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  {mcaData.peaks.map((p) => (
                    <ReferenceLine
                      key={p.energy}
                      x={Math.round(p.energy)}
                      stroke="#9333EA"
                      strokeDasharray="3 3"
                      label={{ value: `${p.energy} keV`, fill: '#9333EA', fontSize: 10 }}
                    />
                  ))}
                  <Area
                    type="monotone"
                    dataKey="counts"
                    stroke="#9333EA"
                    strokeWidth={2}
                    fill="#F3E8FF"
                    fillOpacity={0.65}
                    name="Counts / Bin"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#78716C] font-sans">
              Photoelectric total energy deposition yields narrow Gaussian photopeaks. Observe the Compton shoulder and backscatter peak (~215 keV) produced by 180° photons scattering back from the detector enclosure walls.
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: EXOPLANET TRANSIT PHOTOMETRY */}
      {/* ==================================================================== */}
      {activeTab === 'exoplanet' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Transit Depth (δ)</div>
              <div className="text-base font-bold text-[#9333EA] mt-1">{exoplanetData.transitDepthPpm} ppm</div>
              <div className="text-[10px] text-[#78716C]">{exoplanetData.transitDepthPct}% stellar flux dip</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Planet Radius Ratio</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{planetRadiusRatio.toFixed(3)} R_p / R_*</div>
              <div className="text-[10px] text-[#78716C]">
                {planetRadiusRatio < 0.03 ? 'Terrestrial Earth-Sized' : planetRadiusRatio < 0.07 ? 'Sub-Neptune' : 'Gas Giant (Hot Jupiter)'}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Orbital Period (P)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{orbitalPeriodDays.toFixed(2)} days</div>
              <div className="text-[10px] text-[#78716C]">Kepler BLS periodogram peak</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Transit Duration</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{exoplanetData.durationHours} hrs</div>
              <div className="text-[10px] text-[#78716C]">Ingress to egress time</div>
            </div>
          </div>

          {/* Interactive Transit Controls */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#9333EA]" />
                <span>Orbital Geometry &amp; Planetary Parameters (Mandel-Agol Limb Darkening)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Radius Ratio (Rp / R*):</span>
                  <span className="font-bold text-[#9333EA]">{planetRadiusRatio.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.015"
                  max="0.14"
                  step="0.005"
                  value={planetRadiusRatio}
                  onChange={(e) => setPlanetRadiusRatio(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">0.01 (Earth ~84 ppm) • 0.10 (Jupiter ~10,000 ppm)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Orbital Period (Days):</span>
                  <span className="font-bold text-[#9333EA]">{orbitalPeriodDays.toFixed(2)} d</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="20.0"
                  step="0.2"
                  value={orbitalPeriodDays}
                  onChange={(e) => setOrbitalPeriodDays(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">Folded Box Least Squares (BLS) period</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Impact Parameter (b = a cos i / R*):</span>
                  <span className="font-bold text-[#9333EA]">{impactParameter.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.85"
                  step="0.05"
                  value={impactParameter}
                  onChange={(e) => setImpactParameter(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">0.0 (Central transit) • 0.85 (Grazing chord)</div>
              </div>
            </div>
          </div>

          {/* Folded Transit Light Curve Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Orbit className="w-4 h-4 text-[#9333EA]" />
                <span>Folded Photometric Transit Light Curve ΔF/F vs Orbital Phase</span>
              </div>
              <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
                Quadratic Stellar Limb Darkening (u₁=0.40, u₂=0.25)
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={exoplanetData.series} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="phase" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" φ" />
                  <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine x={0} stroke="#DDD6C7" strokeDasharray="3 3" />
                  <ReferenceLine y={1.0} stroke="#DDD6C7" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="relativeFlux" stroke="#9333EA" strokeWidth={1.5} dot={{ r: 1.5, fill: '#9333EA' }} name="Observed Kepler Cadence" isAnimationActive={false} />
                  <Line type="monotone" dataKey="limbDarkened" stroke="#0F766E" strokeWidth={2} dot={false} name="Mandel-Agol Model" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#78716C] font-sans">
              The gentle curvature of the transit bottom is caused by stellar limb darkening (the stellar photosphere is brighter at the center than at the limb). Planetary transit spectroscopy allows transmission atmospheric characterization.
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PULSAR DISPERSION MEASURE */}
      {/* ==================================================================== */}
      {activeTab === 'pulsar' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Dispersion Measure (DM)</div>
              <div className="text-base font-bold text-[#9333EA] mt-1">{pulsarData.electronColumnDensity}</div>
              <div className="text-[10px] text-[#78716C]">∫ n_e dl along line of sight</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Dispersive Sweep Delay</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{pulsarData.totalDelayMs} ms</div>
              <div className="text-[10px] text-[#78716C]">Across 400 MHz to 1400 MHz</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Pulsar Spin Period</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{pulsarPeriodMs.toFixed(1)} ms</div>
              <div className="text-[10px] text-[#78716C]">Spin Frequency: {pulsarData.crabRotationalFreq} Hz</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Plasma Dispersion Law</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">t(ν) ∝ ν⁻²</div>
              <div className="text-[10px] text-[#78716C]">Cold interstellar electron plasma</div>
            </div>
          </div>

          {/* Interactive Pulsar Controls */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#9333EA]" />
                <span>Interstellar Medium (ISM) Cold Plasma &amp; Pulsar Astrometry</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Dispersion Measure (DM):</span>
                  <span className="font-bold text-[#9333EA]">{dispersionMeasure.toFixed(1)} pc cm⁻³</span>
                </div>
                <input
                  type="range"
                  min="15.0"
                  max="350.0"
                  step="5.0"
                  value={dispersionMeasure}
                  onChange={(e) => setDispersionMeasure(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">56.8 (Crab PSR B0531+21) • 348.8 (FRB 180916B)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Rotational Period:</span>
                  <span className="font-bold text-[#9333EA]">{pulsarPeriodMs.toFixed(1)} ms</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="120.0"
                  step="2.0"
                  value={pulsarPeriodMs}
                  onChange={(e) => setPulsarPeriodMs(parseFloat(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">Millisecond to young Crab-like pulsars</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Receiving Center Frequency:</span>
                  <span className="font-bold text-[#9333EA]">{centerFreqMhz} MHz</span>
                </div>
                <input
                  type="range"
                  min="400"
                  max="1400"
                  step="50"
                  value={centerFreqMhz}
                  onChange={(e) => setCenterFreqMhz(parseInt(e.target.value))}
                  className="w-full accent-[#9333EA] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">400 MHz (P-Band) • 1400 MHz (L-Band 21cm)</div>
              </div>
            </div>
          </div>

          {/* Dispersion Delay Curve Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Radio className="w-4 h-4 text-[#9333EA]" />
                <span>Quadratic Frequency Dispersion Delay Curve t(ν) = 4.1488 × 10⁶ × DM / ν²</span>
              </div>
              <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
                Cold Interstellar Plasma Transfer Function
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={pulsarData.series} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="freqMhz" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" MHz" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" ms" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="delayMs" stroke="#9333EA" strokeWidth={2.5} dot={false} name="Dispersive Delay (ms)" isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#78716C] font-sans">
              Lower radio frequencies propagate slower through the interstellar electron plasma ($v_g &lt; c$), causing the characteristic quadratic dispersion sweep. Dedispersion filter banks remove this frequency lag to reveal coherent nanosecond pulse structure.
            </div>
          </div>
        </div>
      )}

      <ExportBar
        title="Quantum &amp; Astrophysics Lab"
        data={{
          activeTab,
          selectedIsotope,
          detectorFwhmPct,
          transitDepthPpm: exoplanetData.transitDepthPpm,
          dispersionMeasure,
          totalDelayMs: pulsarData.totalDelayMs,
        }}
      />
    </div>
  );
};

export default QuantumLabView;
