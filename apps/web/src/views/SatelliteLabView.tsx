import React, { useState, useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { MathFormula } from '../components/common/MathFormula';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { MeaningTable } from '../components/common/MeaningTable';
import { CommonResultSchema } from '../types/analysis';
import {
  getGnssTecData,
  getSpacecraftAttitudeData,
  getInSarInterferogramData,
  getOceanSolitonData,
  getGraceGravityRecoveryData,
} from '../services/earthObservationService';
import { Gnss3DIonosphere } from '../components/geo/Gnss3DIonosphere';
import { SpacecraftAttitude3D } from '../components/geo/SpacecraftAttitude3D';
import { OceanSoliton3D } from '../components/geo/OceanSoliton3D';
import { GraceTwinOrbit3D } from '../components/geo/GraceTwinOrbit3D';
import {
  Satellite,
  Radio,
  Compass,
  Waves,
  Globe2,
  Box,
  Activity,
  Columns,
  Download,
  CheckCircle2,
} from 'lucide-react';
import {
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

export type SatelliteTab = 'gnss_tec' | 'spacecraft_rwa' | 'insar' | 'ocean_kdv' | 'grace_gravity';

interface SatelliteLabViewProps {
  onOpenMethodCard?: (name: string) => void;
}

export const SatelliteLabView: React.FC<SatelliteLabViewProps> = ({ onOpenMethodCard }) => {
  const { loadCustomSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<SatelliteTab>('gnss_tec');
  const [displayMode, setDisplayMode] = useState<'3d' | 'timeseries' | 'dual'>('dual');
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Telemetry Models
  const gnssData = useMemo(() => getGnssTecData(), []);
  const attitudeData = useMemo(() => getSpacecraftAttitudeData(), []);
  const insarData = useMemo(() => getInSarInterferogramData(), []);
  const solitonData = useMemo(() => getOceanSolitonData(), []);
  const graceData = useMemo(() => getGraceGravityRecoveryData(), []);

  // Ingestion handler
  const handleIngest = (name: string, timestamps: number[], values: number[], _meta: string) => {
    const fs = timestamps.length > 1 ? 1 / Math.max(1e-6, timestamps[1] - timestamps[0]) : 1.0;
    loadCustomSignal({
      id: `custom_${name}_${Date.now()}`,
      filename: `${name}.dat`,
      samplingRate: fs,
      timestamps,
      channels: { [name]: values },
      channelNames: [name],
      duration: timestamps[timestamps.length - 1] - timestamps[0],
      quality: {
        total_samples: values.length,
        channel_count: 1,
        sampling_rate: fs,
        is_uniform: true,
        timestamp_jitter_pct: 0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: `sat_${name}`,
        warnings: [],
      },
    });
    setIngestSuccess(name);
    setTimeout(() => setIngestSuccess(null), 3500);
  };

  // Common Results Schema for Meaning Table
  const satelliteResults: CommonResultSchema[] = useMemo(() => {
    return [
      {
        method: 'Dual-Frequency GNSS Ionospheric Dispersion & S4',
        version: '2.0.0',
        parameters: { carrier_f1: '1575.42 MHz', carrier_f2: '1227.60 MHz', ipp_alt_km: 350 },
        estimate: gnssData.s4Index,
        test_statistic: gnssData.s4Index,
        diagnostics: [
          { name: 'Scintillation Index S4', value: `${gnssData.s4Index} (${gnssData.scintillationLevel})`, passed: true },
          { name: 'Slant TEC Range', value: `${Math.min(...gnssData.slantTecUnits).toFixed(1)} - ${Math.max(...gnssData.slantTecUnits).toFixed(1)} TECU`, passed: true },
        ],
        assumptions: [{ text: 'Thin-shell ionospheric phase screen at 350 km altitude', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: `Dual-frequency phase delay resolves ${gnssData.slantTecUnits[200]} TECU with S4 index of ${gnssData.s4Index}.`,
        meaning: 'Quantifies electron density turbulence along the satellite line of sight, warning of potential carrier slip.',
        evidence_refs: ['gnss_tec_dispersion'],
        runtime_ms: 18,
      },
      {
        method: 'RWA Micro-Vibration & Quaternion Attitude Jitter',
        version: '2.0.0',
        parameters: { wheel_rpm: attitudeData.wheelRpm, orders: '1X, 2X, 3X, BSF' },
        estimate: attitudeData.pointingErrorArcsec,
        diagnostics: [
          { name: 'Pointing Jitter', value: `${Math.max(...attitudeData.jitterMicroRad).toFixed(2)} µrad`, passed: true },
          { name: 'Pointing Error', value: `${attitudeData.pointingErrorArcsec}"`, passed: true },
        ],
        assumptions: [{ text: 'Rigid body Euler rotational dynamics with coupled rotor unbalance', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: `Reaction wheel harmonic orders produce ${attitudeData.pointingErrorArcsec} arcseconds pointing stability.`,
        meaning: 'Validates line-of-sight stabilization on sub-meter optical payload cameras against flywheel disturbances.',
        evidence_refs: ['spacecraft_rwa_orders'],
        runtime_ms: 22,
      },
      {
        method: 'Spaceborne InSAR Phase Fringe & Coherence Unwrapping',
        version: '2.0.0',
        parameters: { wavelength_cm: insarData.wavelengthCm, baseline_m: insarData.perpendicularBaselineM },
        estimate: 48.0,
        diagnostics: [
          { name: 'Fault Displacement', value: '48.0 mm co-seismic slip', passed: true },
          { name: 'Spatial Coherence', value: `γ = ${insarData.coherenceGamma[10].toFixed(2)} (bedrock)`, passed: true },
        ],
        assumptions: [{ text: 'Phase coherence γ > 0.4 for reliable unwrapping without phase cuts', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Interferometric phase fringes reveal 48 mm localized surface displacement across the active rupture.',
        meaning: 'Resolves millimeter-scale ground displacement field from radar repeat-pass microwave interference.',
        evidence_refs: ['insar_deformation_fringes'],
        runtime_ms: 35,
      },
    ];
  }, [gnssData, attitudeData, insarData]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <h1 className="text-base font-bold text-[#1F2430]">
              Satellite Systems &amp; Spaceborne Telemetry Laboratory
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Orbital &amp; Remote Sensing Core
            </span>
          </div>
          <p className="text-xs text-[#6B6F7B] mt-0.5">
            GNSS dual-frequency ionospheric TEC, spacecraft RWA attitude jitter, InSAR radar fringes, oceanic KdV solitons, and GRACE-FO gravity inversion.
          </p>
        </div>

        <ExportBar title="Satellite Systems & Telemetry" data={satelliteResults} />
      </div>

      <CollapsibleExplainer title="What am I observing in the Satellite Systems Laboratory?">
        This laboratory monitors mission-critical spaceborne telemetry and remote sensing regimes. It processes dual-carrier GNSS dispersive delays ($L_1/L_2$) to track ionospheric plasma bubbles, simulates satellite reaction wheel micro-vibrations across harmonic orders, unwraps synthetic aperture radar (InSAR) surface deformation fringes, maps oceanic sub-surface solitary solitons (KdV model), and inverts GRACE-FO tandem K-band ranging residuals into groundwater mass variations.
      </CollapsibleExplainer>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-[#DDD6C7]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('gnss_tec')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'gnss_tec'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            #1 GNSS Ionosphere &amp; S₄
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('spacecraft_rwa')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'spacecraft_rwa'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            #2 Spacecraft Attitude &amp; RWA Jitter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('insar')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'insar'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            #3 InSAR Phase Fringes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocean_kdv')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ocean_kdv'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            #7 Oceanic Soliton (KdV)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grace_gravity')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'grace_gravity'
                ? 'bg-[#0F766E] text-white shadow-2xs'
                : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            #8 GRACE-FO Gravity Inversion
          </button>
        </div>

        {/* Display Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#DDD6C7] p-0.5 rounded-md">
          <button
            type="button"
            onClick={() => setDisplayMode('3d')}
            className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 ${
              displayMode === '3d' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Box className="w-3 h-3" /> 3D
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('timeseries')}
            className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 ${
              displayMode === 'timeseries' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Activity className="w-3 h-3" /> Telemetry
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('dual')}
            className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 ${
              displayMode === 'dual' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Columns className="w-3 h-3" /> Dual
          </button>
        </div>
      </div>

      {ingestSuccess && (
        <div className="p-2.5 rounded bg-[#E6F4F2] border border-[#0F766E]/30 text-xs font-mono text-[#0F766E] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Successfully ingested telemetry stream <strong>{ingestSuccess}</strong> into Workbench SignalContext!</span>
        </div>
      )}

      {/* Main Observatory Display */}
      {activeTab === 'gnss_tec' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F2430]">
                Dual-Frequency GNSS Ionospheric Slant TEC &amp; S₄ Scintillation
              </h2>
              <p className="text-xs text-[#6B6F7B]">
                Carrier phase differential tracking (Delta Phi proportional to Slant TEC) identifying plasma bubble equatorial depletion plumes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleIngest('gnss_slant_tec', gnssData.timeSec, gnssData.slantTecUnits, 'GNSS Dual-Frequency Slant TEC')}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#0F766E] text-white hover:bg-[#0D655E] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ingest into Workbench
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#EFEBE0] border border-[#DDD6C7]">
            <MathFormula
              formula="\text{STEC} = \frac{1}{40.3} \left( \frac{f_1^2 f_2^2}{f_1^2 - f_2^2} \right) (\Phi_1 \lambda_1 - \Phi_2 \lambda_2), \quad S_4 = \sqrt{\frac{\langle I^2 \rangle - \langle I \rangle^2}{\langle I \rangle^2}}"
              displayMode={true}
            />
            <p className="text-[11px] text-[#6B6F7B] font-mono mt-1 text-center">Dispersion delay across L1 (1575.42 MHz) and L2 (1227.60 MHz) and amplitude scintillation index</p>
          </div>

          <div className={`grid gap-4 ${displayMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(displayMode === '3d' || displayMode === 'dual') && (
              <Gnss3DIonosphere
                s4Index={gnssData.s4Index}
                elevationDeg={gnssData.elevationDeg[150]}
                ippLat={gnssData.ippLatDeg[150]}
                ippLon={gnssData.ippLonDeg[150]}
              />
            )}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                  <span>Slant TEC (TECU) vs Time</span>
                  <span className="font-bold text-[#0F766E]">S₄ = {gnssData.s4Index} ({gnssData.scintillationLevel})</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gnssData.timeSec.map((t, idx) => ({ t, stec: gnssData.slantTecUnits[idx], vtec: gnssData.verticalTecUnits[idx] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                      <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit="s" />
                      <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" TECU" />
                      <Tooltip />
                      <Line type="monotone" dataKey="stec" stroke="#0F766E" strokeWidth={1.5} dot={false} name="Slant TEC" />
                      <Line type="monotone" dataKey="vtec" stroke="#4338CA" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Vertical TEC" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'spacecraft_rwa' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F2430]">
                Spacecraft Attitude Quaternion Dynamics &amp; Reaction Wheel Jitter
              </h2>
              <p className="text-xs text-[#6B6F7B]">
                Euler rotational dynamics coupled with high-frequency flywheel rotor unbalance orders ($1\Omega, 2\Omega$).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleIngest('spacecraft_jitter_urad', attitudeData.timeSec, attitudeData.jitterMicroRad, 'Spacecraft LOS Jitter')}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#0F766E] text-white hover:bg-[#0D655E] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ingest into Workbench
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#EFEBE0] border border-[#DDD6C7]">
            <MathFormula
              formula="\mathbf{I} \dot{\boldsymbol{\omega}} + \boldsymbol{\omega} \times (\mathbf{I}\boldsymbol{\omega} + \mathbf{h}_{\text{wheel}}) = \mathbf{T}_{\text{ext}}, \quad F_{\text{jitter}}(t) = \sum_{h} C_h \Omega^2 \cos(h \Omega t + \phi_h)"
              displayMode={true}
            />
            <p className="text-[11px] text-[#6B6F7B] font-mono mt-1 text-center">Coupled spacecraft rotational equations and harmonic flywheel disturbance orders</p>
          </div>

          <div className={`grid gap-4 ${displayMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(displayMode === '3d' || displayMode === 'dual') && (
              <SpacecraftAttitude3D
                wheelRpm={attitudeData.wheelRpm}
                jitterMicroRad={attitudeData.jitterMicroRad[100]}
                pointingErrorArcsec={attitudeData.pointingErrorArcsec}
              />
            )}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                  <span>RWA Disturbance Harmonic Orders</span>
                  <span className="font-bold text-[#D97706]">{attitudeData.wheelRpm} RPM (57.5 Hz)</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attitudeData.orderWaterfall}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                      <XAxis dataKey="order" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit="X" />
                      <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" dB" domain={[-50, 0]} />
                      <Tooltip />
                      <Bar dataKey="amplitudeDb" fill="#D97706" name="Disturbance Power" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'insar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F2430]">
                Spaceborne InSAR Radar Interferogram &amp; Complex Coherence
              </h2>
              <p className="text-xs text-[#6B6F7B]">
                Phase difference Delta phi = (4pi / lambda) Delta R resolving millimeter-scale tectonic rupture and fault slip.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleIngest('insar_slip_profile', insarData.rangeKm, insarData.deformationMm, 'InSAR Ground Slip Profile')}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#0F766E] text-white hover:bg-[#0D655E] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ingest into Workbench
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#EFEBE0] border border-[#DDD6C7]">
            <MathFormula
              formula="\Delta \phi = \arg(s_1 s_2^*) = \frac{4\pi}{\lambda} \Delta R + \phi_{\text{atmo}} + \phi_{\text{noise}}, \quad \gamma = \frac{|\sum s_1 s_2^*|}{\sqrt{\sum |s_1|^2 \sum |s_2|^2}}"
              displayMode={true}
            />
            <p className="text-[11px] text-[#6B6F7B] font-mono mt-1 text-center">Radar repeat-pass interferometric phase and complex spatial coherence matrix</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                <span>Wrapped Interferometric Phase Fringes [-π, +π]</span>
                <span className="font-bold text-[#0F766E]">λ = {insarData.wavelengthCm} cm (C-band)</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insarData.rangeKm.map((r, idx) => ({ r, phase: insarData.phaseWrappedRad[idx] }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                    <XAxis dataKey="r" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" km" />
                    <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" rad" domain={[-3.14, 3.14]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="phase" stroke="#0F766E" fill="#E6F4F2" name="Wrapped Phase" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                <span>Unwrapped Tectonic Slip &amp; Spatial Coherence (γ)</span>
                <span className="font-bold text-[#4338CA]">Max Slip: 48.0 mm</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insarData.rangeKm.map((r, idx) => ({ r, slip: insarData.deformationMm[idx], gamma: insarData.coherenceGamma[idx] * 40 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                    <XAxis dataKey="r" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" km" />
                    <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" mm" />
                    <Tooltip />
                    <Line type="monotone" dataKey="slip" stroke="#DC2626" strokeWidth={2} dot={false} name="Displacement (mm)" />
                    <Line type="monotone" dataKey="gamma" stroke="#6B7280" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Coherence (x40)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ocean_kdv' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F2430]">
                Satellite Altimetry Oceanic Solitary Wave (ISW) Soliton Profiler
              </h2>
              <p className="text-xs text-[#6B6F7B]">
                Sub-surface pycnocline boundary depression governed by Korteweg-de Vries (KdV) non-linear soliton dynamics.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleIngest('ocean_soliton_ssh', solitonData.distanceKm, solitonData.seaSurfaceHeightCm, 'Altimeter Sea Surface Height Anomaly')}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#0F766E] text-white hover:bg-[#0D655E] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ingest into Workbench
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#EFEBE0] border border-[#DDD6C7]">
            <MathFormula
              formula="\frac{\partial \eta}{\partial t} + c_0 \frac{\partial \eta}{\partial x} + \alpha \eta \frac{\partial \eta}{\partial x} + \beta \frac{\partial^3 \eta}{\partial x^3} = 0, \quad \eta(x, t) = -\eta_0 \operatorname{sech}^2\left(\frac{x - Vt}{L}\right)"
              displayMode={true}
            />
            <p className="text-[11px] text-[#6B6F7B] font-mono mt-1 text-center">Nonlinear Korteweg-de Vries ocean internal wave dynamics and exact stable soliton solution</p>
          </div>

          <div className={`grid gap-4 ${displayMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(displayMode === '3d' || displayMode === 'dual') && (
              <OceanSoliton3D
                solitonAmplitudeM={solitonData.solitonAmplitudeM}
                solitonPhaseSpeedMs={solitonData.solitonPhaseSpeedMs}
                characteristicWidthM={solitonData.characteristicWidthM}
              />
            )}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                  <span>Radar Backscatter (σ₀ dB) &amp; Surface Height (cm)</span>
                  <span className="font-bold text-[#0F766E]">V = {solitonData.solitonPhaseSpeedMs} m/s</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={solitonData.distanceKm.map((x, idx) => ({ x, ssh: solitonData.seaSurfaceHeightCm[idx], sigma0: solitonData.radarBackscatterDb[idx] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                      <XAxis dataKey="x" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" km" />
                      <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="ssh" stroke="#0284C7" strokeWidth={2} dot={false} name="SSH (cm)" />
                      <Line type="monotone" dataKey="sigma0" stroke="#F59E0B" strokeWidth={1.5} dot={false} strokeDasharray="3 3" name="Radar σ₀ (dB)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'grace_gravity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1F2430]">
                GRACE / GRACE-FO Tandem Satellite K-Band Gravity Recovery
              </h2>
              <p className="text-xs text-[#6B6F7B]">
                Intersatellite range acceleration inverting subterranean hydrology mass deficits (Equivalent Water Thickness).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleIngest('grace_range_rate', graceData.orbitTimeSec, graceData.rangeRateResidualUmS, 'GRACE K-Band Range-Rate Residuals')}
              className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[#0F766E] text-white hover:bg-[#0D655E] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Ingest into Workbench
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#EFEBE0] border border-[#DDD6C7]">
            <MathFormula
              formula="\ddot{\rho} = \mathbf{e}_{12} \cdot (\mathbf{a}_2 - \mathbf{a}_1) + \frac{|\dot{\mathbf{r}}_2 - \dot{\mathbf{r}}_1|^2 - \dot{\rho}^2}{\rho}, \quad V(r, \theta, \lambda) = \frac{GM}{r}\sum_{n=0}^{N} \left(\frac{R}{r}\right)^n \sum_{m=0}^n \bar{P}_{nm}(\cos\theta) \bar{C}_{nm} e^{i m \lambda}"
              displayMode={true}
            />
            <p className="text-[11px] text-[#6B6F7B] font-mono mt-1 text-center">Microwave tandem orbit ranging inversion into spherical harmonic geopotential coefficients</p>
          </div>

          <div className={`grid gap-4 ${displayMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(displayMode === '3d' || displayMode === 'dual') && (
              <GraceTwinOrbit3D equivalentWaterThicknessCm={graceData.equivalentWaterThicknessCm} />
            )}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="p-3 rounded bg-white border border-[#DDD6C7] space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-[#6B6F7B]">
                  <span>Inter-Satellite Range Rate Residual (µm/s)</span>
                  <span className="font-bold text-[#DC2626]">EWT: {graceData.equivalentWaterThicknessCm} cm</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={graceData.orbitTimeSec.map((t, idx) => ({ t, rate: graceData.rangeRateResidualUmS[idx], accel: graceData.gravityAccelerationUgal[idx] }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE1" />
                      <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6B6F7B' }} unit=" s" />
                      <YAxis tick={{ fontSize: 10, fill: '#6B6F7B' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="rate" stroke="#F59E0B" strokeWidth={1.8} dot={false} name="Range-Rate (µm/s)" />
                      <Line type="monotone" dataKey="accel" stroke="#0F766E" strokeWidth={1.5} dot={false} strokeDasharray="2 2" name="Gravity (µGal)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meaning Table */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[#1F2430] uppercase tracking-wider font-mono">
          Rigorous Satellite Systems Results &amp; Analytical Diagnostics
        </h2>
        <MeaningTable results={satelliteResults} onOpenMethodCard={onOpenMethodCard} />
      </div>
    </div>
  );
};

export default SatelliteLabView;
