import React, { useMemo, useState, useEffect } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { Waves, Activity, Globe, Play, Pause, Sliders, Sparkles } from 'lucide-react';
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

export const EarthSystemsLabView: React.FC = () => {
  const { loadCustomSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'tides' | 'seismic' | 'geomagnetic'>('tides');

  // Streaming & Notification
  const [isLive, setIsLive] = useState<boolean>(true);
  const [liveTick, setLiveTick] = useState<number>(0);
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  // TAB 1: OCEAN TIDES PARAMETERS
  // Lunar phase: 0 = New Moon (Syzygy, Spring), 0.25 = First Quarter (Neap), 0.5 = Full Moon (Spring), 0.75 = Third Quarter (Neap)
  const [moonPhase, setMoonPhase] = useState<number>(0.0);
  const [basinAmplification, setBasinAmplification] = useState<number>(1.8); // 1.0 (deep ocean) to 5.0 (Bay of Fundy resonant shelf)
  const [shallowOvertideM4, setShallowOvertideM4] = useState<number>(0.15); // Shallow coastal distortion

  // TAB 2: SEISMIC STA/LTA PARAMETERS
  const [staWindowSec, setStaWindowSec] = useState<number>(0.6);
  const [ltaWindowSec, setLtaWindowSec] = useState<number>(12.0);
  const [triggerRatio, setTriggerRatio] = useState<number>(3.5);
  const [quakeMagnitude, setQuakeMagnitude] = useState<number>(5.4);

  // TAB 3: GEOMAGNETIC SOLAR WIND PARAMETERS
  const [solarWindVelocity, setSolarWindVelocity] = useState<number>(450); // km/s: 300 to 900
  const [imfBz, setImfBz] = useState<number>(-5.0); // nT: +15 (northward) to -30 (southward reconnection)
  const [protonDensity, setProtonDensity] = useState<number>(8.0); // cm^-3

  // Animation Loop
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 50);
    return () => clearInterval(interval);
  }, [isLive]);

  // ============================================================================
  // TAB 1: OCEAN TIDES MULTI-HARMONIC SYNTHESIS (72 Hours)
  // ============================================================================
  const tideData = useMemo(() => {
    const pts: Array<{ hour: number; elevationM: number; m2Constituent: number; s2Constituent: number; springEnvelope: number }> = [];
    const hours = 72;
    // Harmonic frequencies in rad/hr
    const wM2 = (2 * Math.PI) / 12.4206; // Principal lunar
    const wS2 = (2 * Math.PI) / 12.0000; // Principal solar
    const wK1 = (2 * Math.PI) / 23.9345; // Diurnal luni-solar declination
    const wO1 = (2 * Math.PI) / 25.8193; // Diurnal lunar
    const wM4 = 2 * wM2; // Shallow water overtide

    // Moon phase modulation: syzygy (0.0 or 0.5) maximizes sun-moon constructive interference
    const syzygyFactor = Math.abs(Math.cos(moonPhase * 2 * Math.PI)); // 1 at Spring, 0 at Neap
    const m2Amp = 1.05 * basinAmplification;
    const s2Amp = (0.35 + 0.35 * syzygyFactor) * basinAmplification;
    const k1Amp = 0.45 * basinAmplification;
    const o1Amp = 0.32 * basinAmplification;
    const m4Amp = shallowOvertideM4 * basinAmplification;

    // Time offset for continuous live wave progression
    const timeOffset = (liveTick * 0.05) % 12.42;

    for (let h = 0; h <= hours; h += 0.5) {
      const t = h + timeOffset;
      const m2 = m2Amp * Math.cos(wM2 * t);
      const s2 = s2Amp * Math.cos(wS2 * t + (moonPhase * 2 * Math.PI));
      const k1 = k1Amp * Math.cos(wK1 * t - 0.5);
      const o1 = o1Amp * Math.cos(wO1 * t + 1.1);
      const m4 = m4Amp * Math.cos(wM4 * t - 0.8);

      const total = m2 + s2 + k1 + o1 + m4;
      const envelope = (m2Amp + s2Amp) * 1.1;

      pts.push({
        hour: Number(h.toFixed(1)),
        elevationM: Number(total.toFixed(3)),
        m2Constituent: Number(m2.toFixed(3)),
        s2Constituent: Number(s2.toFixed(3)),
        springEnvelope: Number(envelope.toFixed(3)),
      });
    }

    const maxElev = Math.max(...pts.map((p) => p.elevationM));
    const minElev = Math.min(...pts.map((p) => p.elevationM));
    const tidalRange = Number((maxElev - minElev).toFixed(2));

    return {
      series: pts,
      tidalRange,
      m2Amp: Number(m2Amp.toFixed(2)),
      s2Amp: Number(s2Amp.toFixed(2)),
      isSpringTide: syzygyFactor > 0.65,
    };
  }, [moonPhase, basinAmplification, shallowOvertideM4, liveTick]);

  // ============================================================================
  // TAB 2: SEISMIC STA/LTA EVENT DETECTOR (40 Seconds)
  // ============================================================================
  const seismicData = useMemo(() => {
    const pts: Array<{ timeSec: number; rawSeismogram: number; staLtaRatio: number; triggerActive: boolean; envelope: number }> = [];
    const totalSec = 30.0;
    const dt = 0.05; // 20 Hz telemetry
    const n = Math.floor(totalSec / dt);

    const pArrival = 7.5;
    const sArrival = pArrival * 1.732; // Wadati Poisson ratio: 13.0 s
    const codaDecay = 0.28;

    // Window samples
    const nSta = Math.max(3, Math.round(staWindowSec / dt));
    const nLta = Math.max(20, Math.round(ltaWindowSec / dt));

    const rawSignal: number[] = [];
    const charFunc: number[] = [];

    // Continuous rolling time shift
    const rollOffset = (liveTick * 0.1) % 15.0;

    for (let i = 0; i < n; i++) {
      const t = i * dt;
      const tRel = t - rollOffset;

      // Ambient background microseismic noise (ocean wave primary microseism ~0.14 Hz)
      let sig = 0.12 * Math.sin(t * 1.8) + 0.08 * Math.cos(t * 4.2) + (Math.sin(i * 13.7) * 0.06);

      // P-Wave: High-frequency compressional onset
      if (tRel >= pArrival) {
        const dtP = tRel - pArrival;
        const pAmp = Math.pow(10, (quakeMagnitude - 4.5) * 0.5) * Math.exp(-codaDecay * dtP);
        sig += pAmp * Math.sin(dtP * 28.0) * (dtP < 0.5 ? (dtP / 0.5) : 1.0);
      }

      // S-Wave: Low-frequency, higher amplitude shear wave
      if (tRel >= sArrival) {
        const dtS = tRel - sArrival;
        const sAmp = Math.pow(10, (quakeMagnitude - 4.5) * 0.5) * 2.4 * Math.exp(-codaDecay * 0.7 * dtS);
        sig += sAmp * Math.sin(dtS * 14.0 + 1.2);
      }

      rawSignal.push(sig);
      // Allen Characteristic function: CF = x^2 + C * (dx/dt)^2
      const prevSig = i > 0 ? rawSignal[i - 1] : sig;
      const dSig = (sig - prevSig) / dt;
      charFunc.push(sig * sig + 0.01 * dSig * dSig);
    }

    // Compute causal STA and LTA
    let triggered = false;
    let peakRatio = 0.0;

    for (let i = 0; i < n; i++) {
      const t = i * dt;

      // STA
      const staStart = Math.max(0, i - nSta);
      let staSum = 0;
      for (let k = staStart; k <= i; k++) staSum += charFunc[k];
      const sta = staSum / Math.max(1, i - staStart + 1);

      // LTA
      const ltaStart = Math.max(0, i - nLta);
      let ltaSum = 0;
      for (let k = ltaStart; k <= i; k++) ltaSum += charFunc[k];
      const lta = Math.max(0.001, ltaSum / Math.max(1, i - ltaStart + 1));

      const ratio = sta / lta;
      if (ratio > peakRatio) peakRatio = ratio;
      if (ratio >= triggerRatio) triggered = true;

      pts.push({
        timeSec: Number(t.toFixed(2)),
        rawSeismogram: Number(rawSignal[i].toFixed(3)),
        staLtaRatio: Number(ratio.toFixed(2)),
        triggerActive: ratio >= triggerRatio,
        envelope: Number(Math.sqrt(charFunc[i]).toFixed(3)),
      });
    }

    return {
      series: pts,
      peakRatio: Number(peakRatio.toFixed(2)),
      isTriggered: triggered,
      pArrivalSec: pArrival,
      sArrivalSec: Number(sArrival.toFixed(1)),
      wadatiRatio: 1.732,
    };
  }, [staWindowSec, ltaWindowSec, triggerRatio, quakeMagnitude, liveTick]);

  // ============================================================================
  // TAB 3: GEOMAGNETIC COUPLING & SOLAR WIND DISTURBANCE
  // ============================================================================
  const geomagneticData = useMemo(() => {
    // Dynamic Pressure: P_dyn = 1.67e-6 * n_p * v_sw^2 (nPa)
    const pDyn = 1.67e-6 * protonDensity * Math.pow(solarWindVelocity, 2);

    // Southward IMF Bz controls dayside magnetic reconnection
    // Akasofu epsilon parameter ~ v_sw * B^2 * sin^4(theta/2)
    const bSouth = Math.max(0, -imfBz);
    const reconnectionStrength = (solarWindVelocity / 400.0) * Math.pow(bSouth, 1.4);

    // NOAA Kp Index (0 to 9)
    let kpEst = 1.0 + (solarWindVelocity - 300) / 120.0 + (bSouth * 0.32) + (pDyn * 0.25);
    kpEst = Math.max(0.0, Math.min(9.0, kpEst));

    // Dst Index in nT (Negative means intense ring current westward buildup)
    let dstEst = 15.0 - (reconnectionStrength * 4.2) - (pDyn * 2.1);
    dstEst = Math.max(-450, Math.min(30, dstEst));

    // Auroral Oval Equatorward Latitude: Lambda = 66 - 2.5 * Kp
    const auroralLat = Math.max(48, 66 - 2.2 * kpEst);

    // 24-hour Ring Current simulation profile
    const profile: Array<{ hour: number; ringCurrentDst: number; magnetopauseDistanceRe: number }> = [];
    const rMp = Math.pow(100 / Math.max(0.5, pDyn), 1 / 6.0); // Magnetopause standoff distance in Earth radii

    for (let h = 0; h <= 24; h += 0.5) {
      const stormPhase = h < 6 ? 'Initial' : h < 14 ? 'Main' : 'Recovery';
      const phaseNoise = Math.sin(h * 2.1 + liveTick * 0.1) * 3.5;
      let dst = dstEst;
      if (stormPhase === 'Initial') dst = Math.max(0, dstEst * 0.3 + 12);
      if (stormPhase === 'Recovery') dst = dstEst * (1 - (h - 14) / 14);

      profile.push({
        hour: Number(h.toFixed(1)),
        ringCurrentDst: Number((dst + phaseNoise).toFixed(1)),
        magnetopauseDistanceRe: Number((rMp + Math.sin(h * 0.5) * 0.3).toFixed(2)),
      });
    }

    return {
      kpIndex: Number(kpEst.toFixed(1)),
      dstIndex: Number(dstEst.toFixed(0)),
      dynamicPressureNpa: Number(pDyn.toFixed(2)),
      auroralLatitudeDeg: Number(auroralLat.toFixed(1)),
      magnetopauseRe: Number(rMp.toFixed(1)),
      stormCategory:
        kpEst >= 8.5 ? 'G5 (Extreme Storm)' :
        kpEst >= 7.0 ? 'G4 (Severe Storm)' :
        kpEst >= 6.0 ? 'G3 (Strong Storm)' :
        kpEst >= 5.0 ? 'G2 (Moderate Storm)' :
        kpEst >= 4.0 ? 'G1 (Minor Disturbance)' : 'Quiet / Unsettled',
      series: profile,
    };
  }, [solarWindVelocity, imfBz, protonDensity, liveTick]);

  // Ingest handler
  const handleIngestSignal = () => {
    let sigName = '';
    let channelNames: string[] = [];
    let channels: Record<string, number[]> = {};
    let timestamps: number[] = [];
    let fs = 20;

    if (activeTab === 'tides') {
      sigName = `Ocean_Tide_Harmonics_${tideData.isSpringTide ? 'Spring' : 'Neap'}_Range${tideData.tidalRange}m.csv`;
      timestamps = tideData.series.map((d) => d.hour * 3600);
      channelNames = ['Total_Water_Elevation', 'Principal_Lunar_M2', 'Principal_Solar_S2'];
      channels = {
        Total_Water_Elevation: tideData.series.map((d) => d.elevationM),
        Principal_Lunar_M2: tideData.series.map((d) => d.m2Constituent),
        Principal_Solar_S2: tideData.series.map((d) => d.s2Constituent),
      };
      fs = 2; // Semi-hourly
    } else if (activeTab === 'seismic') {
      sigName = `Seismic_Telemetry_M${quakeMagnitude.toFixed(1)}_STALTA.csv`;
      timestamps = seismicData.series.map((d) => d.timeSec);
      channelNames = ['Vertical_Component_Z', 'STA_LTA_Ratio', 'Envelope'];
      channels = {
        Vertical_Component_Z: seismicData.series.map((d) => d.rawSeismogram),
        STA_LTA_Ratio: seismicData.series.map((d) => d.staLtaRatio),
        Envelope: seismicData.series.map((d) => d.envelope),
      };
      fs = 20;
    } else {
      sigName = `Geomagnetic_Storm_Dst_${geomagneticData.dstIndex}nT_Kp${geomagneticData.kpIndex}.csv`;
      timestamps = geomagneticData.series.map((d) => d.hour * 3600);
      channelNames = ['Ring_Current_Dst', 'Magnetopause_Standoff_Re'];
      channels = {
        Ring_Current_Dst: geomagneticData.series.map((d) => d.ringCurrentDst),
        Magnetopause_Standoff_Re: geomagneticData.series.map((d) => d.magnetopauseDistanceRe),
      };
      fs = 2;
    }

    const sig: SignalData = {
      id: `earth-${activeTab}-${Date.now()}`,
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
        content_hash_sha256: `earth-geophys-${activeTab}-hash`,
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
            <h1 className="text-base font-bold text-[#1F2430]">Earth Observation &amp; Tidal Systems Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0284C7]/15 text-[#0284C7] font-bold">
              Dimension 4 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Geophysical telemetry: Doodson harmonic tidal constituents ($M_2, S_2, K_1, O_1$), Allen STA/LTA seismic event detection, and solar wind geomagnetic storm coupling.
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-mono font-bold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does Doodson Harmonic Decomposition model global ocean tides?">
        Gravitational tidal potential from the Moon and Sun is decomposed via celestial mechanics into discrete harmonic constituents.
        The semidiurnal components $M_2$ (lunar principal, 12.42h) and $S_2$ (solar principal, 12.00h) dictate spring-neap tidal modulation.
        Diurnal constituents $K_1$ (luni-solar declination, 23.93h) and $O_1$ (lunar principal diurnal, 25.82h) govern diurnal inequalities across ocean basins.
      </CollapsibleExplainer>

      {/* TAB SWITCHER */}
      <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('tides')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'tides'
              ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Ocean Tides &amp; Harmonics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seismic')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'seismic'
              ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Seismic STA/LTA Detector</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('geomagnetic')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded transition-colors ${
            activeTab === 'geomagnetic'
              ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Geomagnetic Storms &amp; Solar Wind</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: OCEAN TIDES */}
      {/* ==================================================================== */}
      {activeTab === 'tides' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Tidal Range</div>
              <div className="text-base font-bold text-[#0284C7] mt-1">{tideData.tidalRange} m</div>
              <div className="text-[10px] text-[#78716C]">
                {tideData.isSpringTide ? 'SPRING TIDE (Constructive Syzygy)' : 'NEAP TIDE (Quadrature)'}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Principal Lunar (M₂)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{tideData.m2Amp} m</div>
              <div className="text-[10px] text-[#78716C]">Period: 12.4206 hrs (28.984°/h)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Principal Solar (S₂)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{tideData.s2Amp} m</div>
              <div className="text-[10px] text-[#78716C]">Period: 12.0000 hrs (30.000°/h)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Moon Phase Angle</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{(moonPhase * 360).toFixed(0)}°</div>
              <div className="text-[10px] text-[#78716C]">
                {moonPhase === 0 ? 'New Moon' : moonPhase === 0.25 ? 'First Quarter' : moonPhase === 0.5 ? 'Full Moon' : 'Third Quarter'}
              </div>
            </div>
          </div>

          {/* Interactive Tidal Controls */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <span>Lunar Orbital Geometry &amp; Coastal Bathymetry Parameters</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold ${
                  isLive ? 'bg-[#0284C7] text-white' : 'bg-[#EFEBE0] text-[#1F2430]'
                }`}
              >
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isLive ? 'Live Flow' : 'Pause'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Moon Phase (Spring ↔ Neap):</span>
                  <span className="font-bold text-[#0284C7]">{(moonPhase * 360).toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={moonPhase}
                  onChange={(e) => setMoonPhase(parseFloat(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">0° (New Moon) • 90° (First Qtr) • 180° (Full Moon)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Basin Resonance Funneling:</span>
                  <span className="font-bold text-[#0284C7]">{basinAmplification.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="4.5"
                  step="0.1"
                  value={basinAmplification}
                  onChange={(e) => setBasinAmplification(parseFloat(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">1.0x (Open Ocean) • 4.5x (Resonant Continental Shelf)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Shallow Water M₄ Overtide:</span>
                  <span className="font-bold text-[#0284C7]">{shallowOvertideM4.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={shallowOvertideM4}
                  onChange={(e) => setShallowOvertideM4(parseFloat(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">Nonlinear frictional distortion in shallow estuaries</div>
              </div>
            </div>
          </div>

          {/* 72-Hour Tidal Elevation Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Waves className="w-4 h-4 text-[#0284C7]" />
                <span>72-Hour Multi-Harmonic Water Level Elevation η(t)</span>
              </div>
              <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
                Harmonics: M₂ + S₂ + K₁ + O₁ + M₄
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={tideData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="hour" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" h" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" m" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine y={0} stroke="#DDD6C7" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="elevationM" stroke="#0284C7" strokeWidth={2} fill="#E0F2FE" fillOpacity={0.6} name="Sea Surface η(t)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="m2Constituent" stroke="#1F2430" strokeWidth={1.25} strokeDasharray="4 4" name="Lunar M₂ (12.42h)" dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="s2Constituent" stroke="#0F766E" strokeWidth={1.25} strokeDasharray="2 2" name="Solar S₂ (12.00h)" dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#78716C] font-sans">
              Notice the diurnal inequality: unequal successive high water peaks caused by the declination of the Moon and Sun ($K_1$ and $O_1$ harmonic constituents).
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SEISMIC STA/LTA */}
      {/* ==================================================================== */}
      {activeTab === 'seismic' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">STA/LTA Peak Trigger</div>
              <div className={`text-base font-bold mt-1 ${seismicData.isTriggered ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>
                {seismicData.peakRatio}x
              </div>
              <div className="text-[10px] text-[#78716C]">
                {seismicData.isTriggered ? 'EVENT DETECTED (r ≥ η)' : 'BACKGROUND NOISE'}
              </div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">P-Wave Arrival (t_P)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{seismicData.pArrivalSec} s</div>
              <div className="text-[10px] text-[#78716C]">Primary Compressional Front</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">S-Wave Arrival (t_S)</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{seismicData.sArrivalSec} s</div>
              <div className="text-[10px] text-[#78716C]">Secondary Transverse Shear</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Wadati Ratio (Vp / Vs)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{seismicData.wadatiRatio}</div>
              <div className="text-[10px] text-[#78716C]">Poisson Solid (ν = 0.25)</div>
            </div>
          </div>

          {/* Interactive Seismic Controls */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#DC2626]" />
                <span>Allen (1978) Causal STA/LTA Detector Parameters</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLive(!isLive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold ${
                  isLive ? 'bg-[#DC2626] text-white' : 'bg-[#EFEBE0] text-[#1F2430]'
                }`}
              >
                {isLive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isLive ? 'Live Sweep' : 'Pause'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">STA Window (s):</span>
                  <span className="font-bold text-[#DC2626]">{staWindowSec.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={staWindowSec}
                  onChange={(e) => setStaWindowSec(parseFloat(e.target.value))}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">LTA Window (s):</span>
                  <span className="font-bold text-[#DC2626]">{ltaWindowSec.toFixed(1)} s</span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="25.0"
                  step="1.0"
                  value={ltaWindowSec}
                  onChange={(e) => setLtaWindowSec(parseFloat(e.target.value))}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Trigger Threshold (η):</span>
                  <span className="font-bold text-[#DC2626]">{triggerRatio.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="7.0"
                  step="0.2"
                  value={triggerRatio}
                  onChange={(e) => setTriggerRatio(parseFloat(e.target.value))}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Quake Magnitude (Mw):</span>
                  <span className="font-bold text-[#DC2626]">M {quakeMagnitude.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="3.5"
                  max="7.5"
                  step="0.1"
                  value={quakeMagnitude}
                  onChange={(e) => setQuakeMagnitude(parseFloat(e.target.value))}
                  className="w-full accent-[#DC2626] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Dual Seismogram & STA/LTA Ratio Chart */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart A: Raw Seismogram */}
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
                <span className="font-bold text-[#1F2430]">Raw Broadband Seismogram [Vertical Z]</span>
                <span className="text-[10px] text-[#78716C]">P and S Phase Arrivals</span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={seismicData.series} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit="s" />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={seismicData.pArrivalSec} stroke="#0F766E" strokeDasharray="3 3" label={{ value: 'P-wave', fill: '#0F766E', fontSize: 10 }} />
                    <ReferenceLine x={seismicData.sArrivalSec} stroke="#B45F1B" strokeDasharray="3 3" label={{ value: 'S-wave', fill: '#B45F1B', fontSize: 10 }} />
                    <Line type="monotone" dataKey="rawSeismogram" stroke="#1F2430" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: STA/LTA Ratio */}
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
                <span className="font-bold text-[#1F2430]">STA/LTA Ratio r(t) vs Threshold η</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${seismicData.isTriggered ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                  {seismicData.isTriggered ? 'TRIGGER LATCHED' : 'QUIET'}
                </span>
              </div>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={seismicData.series} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit="s" />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine y={triggerRatio} stroke="#DC2626" strokeDasharray="3 3" label={{ value: `η = ${triggerRatio}x`, fill: '#DC2626', fontSize: 10 }} />
                    <Line type="monotone" dataKey="staLtaRatio" stroke="#DC2626" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: GEOMAGNETIC STORMS */}
      {/* ==================================================================== */}
      {activeTab === 'geomagnetic' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">NOAA Kp Index</div>
              <div className={`text-base font-bold mt-1 ${geomagneticData.kpIndex >= 5.0 ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>
                Kp = {geomagneticData.kpIndex}
              </div>
              <div className="text-[10px] text-[#78716C]">{geomagneticData.stormCategory}</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Ring Current Dst Index</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{geomagneticData.dstIndex} nT</div>
              <div className="text-[10px] text-[#78716C]">Equatorial magnetic depression</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Solar Wind Ram Pressure</div>
              <div className="text-base font-bold text-[#0284C7] mt-1">{geomagneticData.dynamicPressureNpa} nPa</div>
              <div className="text-[10px] text-[#78716C]">P_dyn = 1.67 × 10⁻⁶ n_p v²</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Auroral Oval Boundary</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{geomagneticData.auroralLatitudeDeg}° N</div>
              <div className="text-[10px] text-[#78716C]">Equatorward geomagnetic latitude</div>
            </div>
          </div>

          {/* Interactive Solar Wind Sliders */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#0284C7]" />
                <span>Interplanetary Magnetic Field (IMF) &amp; Solar Wind Coupling Controls</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Solar Wind Speed (v_sw):</span>
                  <span className="font-bold text-[#0284C7]">{solarWindVelocity} km/s</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="900"
                  step="25"
                  value={solarWindVelocity}
                  onChange={(e) => setSolarWindVelocity(parseInt(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">300 km/s (Quiet) • 850 km/s (Fast CME Shock Front)</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">IMF Bz (North ↔ South):</span>
                  <span className={`font-bold ${imfBz < -5 ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>{imfBz.toFixed(1)} nT</span>
                </div>
                <input
                  type="range"
                  min="-25.0"
                  max="15.0"
                  step="1.0"
                  value={imfBz}
                  onChange={(e) => setImfBz(parseFloat(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">&lt; -10 nT triggers violent dayside magnetic reconnection</div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Proton Density (n_p):</span>
                  <span className="font-bold text-[#0284C7]">{protonDensity.toFixed(1)} cm⁻³</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="35.0"
                  step="1.0"
                  value={protonDensity}
                  onChange={(e) => setProtonDensity(parseFloat(e.target.value))}
                  className="w-full accent-[#0284C7] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">Compresses magnetopause standoff distance</div>
              </div>
            </div>
          </div>

          {/* Dst Ring Current Depression Plot */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Globe className="w-4 h-4 text-[#0284C7]" />
                <span>24-Hour Storm Profile: Equatorial Ring Current Dst Index (nT)</span>
              </div>
              <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
                Magnetopause Standoff: {geomagneticData.magnetopauseRe} R_E
              </span>
            </div>

            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={geomagneticData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="hour" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" h" />
                  <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit=" nT" />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <ReferenceLine y={-50} stroke="#EAB308" strokeDasharray="3 3" label={{ value: 'Moderate Storm (-50 nT)', fill: '#EAB308', fontSize: 10 }} />
                  <ReferenceLine y={-100} stroke="#DC2626" strokeDasharray="3 3" label={{ value: 'Intense Storm (-100 nT)', fill: '#DC2626', fontSize: 10 }} />
                  <Line type="monotone" dataKey="ringCurrentDst" stroke="#0284C7" strokeWidth={2} name="Dst (nT)" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-[#78716C] font-sans">
              Negative Dst excursion directly quantifies the intensification of the Van Allen westward equatorial ring current ($3 - 5\,R_\oplus$), inducing significant geomagnetically induced currents (GIC) in power transmission grids.
            </div>
          </div>
        </div>
      )}

      <ExportBar
        title="Earth Observation &amp; Tidal Systems Lab"
        data={{
          activeTab,
          tidalRange: tideData.tidalRange,
          seismicPeakRatio: seismicData.peakRatio,
          isTriggered: seismicData.isTriggered,
          kpIndex: geomagneticData.kpIndex,
          dstIndex: geomagneticData.dstIndex,
        }}
      />
    </div>
  );
};

export default EarthSystemsLabView;
