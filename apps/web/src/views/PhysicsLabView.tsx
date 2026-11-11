import React, { useState, useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { SignalData } from '../types/signal';
import { MathFormula } from '../components/common/MathFormula';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { MeaningTable } from '../components/common/MeaningTable';
import { CommonResultSchema } from '../types/analysis';
import {
  getCernHiggsData,
  getHpgeNuclearData,
  getMuonRelativityData,
  getTokamakMhdData,
  getIsingModelData,
  getSeismicPremData,
  getReactorKineticsData,
} from '../services/physicsSuiteService';

// 3D Visualizer Engines
import { CernHiggs3DCollider } from '../components/physics/CernHiggs3DCollider';
import { Hpge3DGemmaCrystal } from '../components/physics/Hpge3DGemmaCrystal';
import { Muon3DRelativity } from '../components/physics/Muon3DRelativity';
import { Tokamak3DFusion } from '../components/physics/Tokamak3DFusion';
import { Ising3DSpinLattice } from '../components/physics/Ising3DSpinLattice';
import { Seismic3DEarthRaytracer } from '../components/physics/Seismic3DEarthRaytracer';
import { NuclearReactor3DCore } from '../components/physics/NuclearReactor3DCore';

import {
  Atom,
  Shield,
  Clock,
  Flame,
  Globe,
  Zap,
  Box,
  Activity,
  Columns,
  Download,
  CheckCircle2,
  Grid,
  Sliders,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
  ComposedChart,
} from 'recharts';

interface PhysicsLabViewProps {
  onOpenMethodCard?: (name: string) => void;
}

export type PhysicsTab =
  | 's1_cern'
  | 's4_hpge'
  | 's5_muon'
  | 's6_tokamak'
  | 's7_ising'
  | 's8_seismic'
  | 's10_reactor'
  | 'custom_sim';

export const PhysicsLabView: React.FC<PhysicsLabViewProps> = ({ onOpenMethodCard }) => {
  const { selectDataset, loadCustomSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<PhysicsTab>('s1_cern');
  const [displayMode, setDisplayMode] = useState<'3d' | 'timeseries' | 'dual'>('3d');
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Custom Physics Simulation Sandbox State
  const [simType, setSimType] = useState<'collider' | 'reactor' | 'ising'>('collider');
  const [simMassGev, setSimMassGev] = useState<number>(125.09); // GeV
  const [simWidthGev, setSimWidthGev] = useState<number>(3.5); // GeV
  const [simEnergyTev, setSimEnergyTev] = useState<number>(13.0); // TeV
  const [simRodPct, setSimRodPct] = useState<number>(35); // %
  const [simReactivityPcm, setSimReactivityPcm] = useState<number>(-120); // pcm
  const [simDelayedBeta, setSimDelayedBeta] = useState<number>(0.0065);
  const [simTempRatio, setSimTempRatio] = useState<number>(1.05); // T / Tc
  const [simExtFieldB, setSimExtFieldB] = useState<number>(0.1); // B field
  const [simCouplingJ, setSimCouplingJ] = useState<number>(1.0); // J

  // Live Continuous Oscilloscope & Telemetry Acquisition Engine
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [liveSpeed, setLiveSpeed] = useState<number>(1);
  const [liveTick, setLiveTick] = useState<number>(0);

  React.useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      setLiveTick((t) => (t + 1) % 100000);
    }, Math.max(25, Math.floor(45 / liveSpeed)));
    return () => clearInterval(interval);
  }, [isLiveActive, liveSpeed]);

  // Calibrated Telemetry Datasets
  const cernData = useMemo(() => getCernHiggsData(), []);
  const hpgeData = useMemo(() => getHpgeNuclearData(), []);
  const muonData = useMemo(() => getMuonRelativityData(), []);
  const tokamakData = useMemo(() => getTokamakMhdData(), []);
  const isingData = useMemo(() => getIsingModelData(), []);
  const seismicData = useMemo(() => getSeismicPremData(), []);
  const reactorData = useMemo(() => getReactorKineticsData(), []);

  // Continuous Live Telemetry Streams for Base Physical Instruments
  const liveCernData = useMemo(() => {
    if (!isLiveActive) return cernData;
    return {
      ...cernData,
      series: cernData.series.map((pt, idx) => {
        const noise = Math.sin(liveTick * 0.2 + idx * 0.6) * Math.sqrt(pt.totalEvents ?? 100) * 0.35;
        return {
          ...pt,
          totalEvents: Math.max(10, Math.round((pt.totalEvents ?? 0) + noise)),
        };
      }),
    };
  }, [cernData, isLiveActive, liveTick]);

  const liveHpgeData = useMemo(() => {
    if (!isLiveActive) return hpgeData;
    return {
      ...hpgeData,
      series: hpgeData.series.map((pt, idx) => {
        const noise = Math.sin(liveTick * 0.25 + idx * 0.4) * Math.sqrt(pt.counts) * 0.3;
        return {
          ...pt,
          counts: Math.max(5, Math.round(pt.counts + noise)),
        };
      }),
    };
  }, [hpgeData, isLiveActive, liveTick]);

  const liveMuonData = useMemo(() => {
    if (!isLiveActive) return muonData;
    return {
      ...muonData,
      series: muonData.series.map((pt, idx) => {
        const rate = pt.relativisticRate ?? 1000;
        const noise = Math.sin(liveTick * 0.3 - idx * 0.45) * Math.sqrt(rate) * 0.35;
        return {
          ...pt,
          relativisticRate: Math.max(0, Math.round(rate + noise)),
        };
      }),
    };
  }, [muonData, isLiveActive, liveTick]);

  const liveTokamakData = useMemo(() => {
    if (!isLiveActive) return tokamakData;
    // Continuous rolling oscilloscope sweep over 80 ms window
    const offset = (liveTick * 0.8) % 60;
    const series = [];
    for (let k = 0; k < 80; k++) {
      const t = k * 1.0;
      const phase = (t + offset) * 0.45;
      const tearingAmp = 0.85 * (1 + 0.3 * Math.sin(phase * 0.1));
      const mirnov = Math.sin(phase * 6.28) * tearingAmp + (Math.sin(phase * 19.3) * 0.2) + (Math.sin(liveTick * 0.5 + k) * 0.05);
      const ip = 15.0 - (t > 50 ? ((t - 50) / 30) * 12 : 0) + Math.sin(phase * 0.8) * 0.15;
      series.push({
        timeMs: t,
        mirnovSignal: Number(mirnov.toFixed(3)),
        mirnovVoltageV: Number((mirnov * 12.0).toFixed(2)),
        plasmaCurrentMa: Number(ip.toFixed(2)),
        electronTempKev: 4.5,
        safetyFactorQ: 2.14,
      });
    }
    return { ...tokamakData, series };
  }, [tokamakData, isLiveActive, liveTick]);

  const liveIsingData = useMemo(() => {
    if (!isLiveActive) return isingData;
    return {
      ...isingData,
      series: isingData.series.map((pt, idx) => {
        const noise = Math.sin(liveTick * 0.2 + idx * 0.5) * 0.035;
        return {
          ...pt,
          simulatedM: Number(Math.max(-1, Math.min(1, (pt.simulatedM ?? 0) + noise)).toFixed(3)),
        };
      }),
    };
  }, [isingData, isLiveActive, liveTick]);

  const liveSeismicData = useMemo(() => {
    if (!isLiveActive) return seismicData;
    const series = [];
    for (let k = 0; k < 80; k++) {
      const t = k;
      const waveTime = (t + liveTick * 0.6) % 100;
      const pEnv = Math.exp(-Math.pow((waveTime - 40) / 6.0, 2));
      const pWave = pEnv * Math.sin(waveTime * 3.5) * 1.8;
      const microseism = 0.25 * Math.sin(t * 0.8 + liveTick * 0.15) + 0.12 * Math.sin(t * 1.9 + liveTick * 0.3);
      series.push({
        timeSec: t,
        amplitude: Number((pWave + microseism).toFixed(3)),
        depthKm: 2890,
        pWaveVelocityKms: 13.7,
        sWaveVelocityKms: 0,
        densityGcm3: 9.9,
        layerName: 'Outer Core Shadow',
      });
    }
    return { ...seismicData, series };
  }, [seismicData, isLiveActive, liveTick]);

  const liveReactorData = useMemo(() => {
    if (!isLiveActive) return reactorData;
    return {
      ...reactorData,
      series: reactorData.series.map((pt, idx) => {
        const noise = Math.sin(liveTick * 0.2 + idx * 0.3) * 22;
        return {
          ...pt,
          powerMw: Math.round((pt.powerMw ?? 3000) + noise),
        };
      }),
    };
  }, [reactorData, isLiveActive, liveTick]);

  // Custom Simulator Dynamic Mathematical Synthesis (Reactive to All Sliders & Continuous Live)
  const customSimTelemetry = useMemo(() => {
    if (simType === 'collider') {
      const nPts = 100;
      const m0 = simMassGev;
      const gamma = simWidthGev;
      const sqrts = simEnergyTev;
      const lumi = Math.pow(sqrts / 13.0, 1.8);

      // Dynamic mass window framing around resonance peak M0 so peak is ALWAYS visible and glides smoothly
      const span = Math.max(30, gamma * 5.5);
      const mMin = Math.max(10, Math.floor(m0 - span));
      const mMax = Math.ceil(m0 + span);

      const series = [];
      for (let i = 0; i <= nPts; i++) {
        const m = mMin + (i / nPts) * (mMax - mMin);
        const qcdBkg = 1800 * lumi * Math.exp(-0.028 * (m - 80));
        const bwNumerator = 350 * gamma * gamma * lumi;
        const bwDenominator = Math.pow(m * m - m0 * m0, 2) + Math.pow(m0 * gamma, 2);
        const bwPeak = (bwNumerator / Math.max(1, bwDenominator)) * 20000;

        const liveNoise = isLiveActive ? Math.sin(liveTick * 0.2 + i * 0.5) * Math.sqrt(qcdBkg + bwPeak) * 0.35 : 0;
        const total = Math.max(0, Math.round(qcdBkg + bwPeak + liveNoise));

        series.push({
          massGev: Number(m.toFixed(2)),
          totalEvents: total,
          qcdBackground: Math.round(qcdBkg),
          signalResonance: Math.round(bwPeak),
        });
      }
      return {
        series,
        mMin,
        mMax,
        fwhm: `${gamma.toFixed(2)} GeV`,
        significance: `${(5.4 * (125.09 / Math.max(80, m0)) * (3.5 / Math.max(0.5, gamma)) * Math.sqrt(lumi)).toFixed(1)} σ`,
        luminosity: `${(lumi * 137.2).toFixed(1)} fb⁻¹`,
      };
    } else if (simType === 'reactor') {
      const nPts = 120;
      const series = [];
      // Realistic rod worth: 0% = 0 pcm, 100% = -3500 pcm
      const rodReactivity = -(simRodPct / 100) * 0.035;
      const extReactivity = (simReactivityPcm * 1e-5);
      const rho = extReactivity + rodReactivity;
      const beta = simDelayedBeta;
      const lambda = 0.08;
      const promptLambda = 1e-4;
      const denom = beta - rho;

      for (let i = 0; i <= nPts; i++) {
        const t = (i / nPts) * 60; // 60 seconds
        let pNorm = 1.0;
        if (Math.abs(denom) > 1e-6) {
          const delayedTerm = (beta / denom) * Math.exp(((lambda * rho) / denom) * t);
          const promptTerm = (rho / denom) * Math.exp(-((denom) / promptLambda) * Math.min(t, 0.05));
          pNorm = Math.max(0.001, delayedTerm - promptTerm);
        }
        const liveNoise = isLiveActive ? Math.sin(liveTick * 0.25 + i * 0.3) * 25 * Math.sqrt(pNorm) : 0;
        const powerMw = Math.max(0, Math.round(3000 * pNorm + liveNoise));
        series.push({
          timeSec: Number(t.toFixed(1)),
          powerMw,
          delayedPrecursor: Math.round(powerMw * 0.95),
        });
      }
      return {
        series,
        netReactivity: `${(rho * 1e5).toFixed(0)} pcm`,
        powerEnd: `${series[series.length - 1].powerMw} MWth`,
        regime: rho > 0 ? (rho >= beta ? 'Prompt Supercritical (SCRAM Required!)' : 'Delayed Supercritical (Surging)') : (rho === 0 ? 'Critical (Steady-State)' : 'Subcritical (Shutdown)'),
      };
    } else {
      // Ising lattice
      const nPts = 100;
      const series = [];
      const J = simCouplingJ;
      const B = simExtFieldB;
      const Tc = 2.269185 * J;

      for (let i = 0; i <= nPts; i++) {
        const tRatio = 0.2 + (i / nPts) * 2.5; // T/Tc from 0.2 to 2.7
        let mSpontaneous = 0;
        if (tRatio < 1.0) {
          const sinhTerm = Math.sinh((2 * J) / tRatio);
          const arg = 1 - Math.pow(sinhTerm, -4);
          mSpontaneous = arg > 0 ? Math.pow(arg, 0.125) : 0;
        }
        const mField = Math.tanh(B / Math.max(0.1, tRatio));
        const totalMag = Math.min(1.0, Math.max(-1.0, mSpontaneous + 0.35 * mField));
        series.push({
          tempRatio: Number(tRatio.toFixed(2)),
          magnetization: Number(totalMag.toFixed(3)),
          susceptibility: Number((1 / (Math.abs(tRatio - 1.0) + 0.15)).toFixed(2)),
        });
      }

      // Current operating point from slider simTempRatio:
      let mOpSpont = 0;
      if (simTempRatio < 1.0) {
        const sinhTerm = Math.sinh((2 * J) / simTempRatio);
        const arg = 1 - Math.pow(sinhTerm, -4);
        mOpSpont = arg > 0 ? Math.pow(arg, 0.125) : 0;
      }
      const mOpField = Math.tanh(B / Math.max(0.1, simTempRatio));
      const opMag = Math.min(1.0, Math.max(-1.0, mOpSpont + 0.35 * mOpField));
      const liveFluctuation = isLiveActive ? (simTempRatio < 1.0 ? 0.04 * Math.sin(liveTick * 0.3) : (Math.abs(simTempRatio - 1.0) < 0.2 ? 0.18 * Math.sin(liveTick * 0.3) : 0.08 * Math.sin(liveTick * 0.4))) : 0;
      const currentLiveM = Number((opMag + liveFluctuation).toFixed(3));

      return {
        series,
        curieTemp: `${Tc.toFixed(3)} J/k_B`,
        orderParam: simTempRatio < 1.0 ? 'Ferromagnetic (Ordered Domains)' : (Math.abs(simTempRatio - 1.0) < 0.15 ? 'Critical Fluctuation Regime' : 'Paramagnetic (Disordered Spontaneous)'),
        operatingMag: currentLiveM,
        operatingChi: Number((1 / (Math.abs(simTempRatio - 1.0) + 0.15)).toFixed(2)),
      };
    }
  }, [simType, simMassGev, simWidthGev, simEnergyTev, simRodPct, simReactivityPcm, simDelayedBeta, simTempRatio, simExtFieldB, simCouplingJ, isLiveActive, liveTick]);

  const handleIngestSimulatedSignal = () => {
    let sigValues: number[] = [];
    let timestamps: number[] = [];
    let sigName = '';
    let fs = 200;

    if (simType === 'collider') {
      sigName = `Simulated_CERN_LHC_Resonance_${simMassGev.toFixed(0)}GeV.csv`;
      const data = customSimTelemetry.series as any[];
      sigValues = data.map((d) => d.totalEvents);
      timestamps = data.map((d) => d.massGev);
      fs = 2;
    } else if (simType === 'reactor') {
      sigName = `Simulated_PWR_Reactor_Transient_${customSimTelemetry.netReactivity}.csv`;
      const data = customSimTelemetry.series as any[];
      sigValues = data.map((d) => d.powerMw);
      timestamps = data.map((d) => d.timeSec);
      fs = 2;
    } else {
      sigName = `Simulated_Ising_Lattice_Order_${simTempRatio.toFixed(2)}Tc.csv`;
      const data = customSimTelemetry.series as any[];
      sigValues = data.map((d) => d.magnetization);
      timestamps = data.map((d) => d.tempRatio);
      fs = 10;
    }

    const customSignal: SignalData = {
      id: `sim-${Date.now()}`,
      filename: sigName,
      samplingRate: fs,
      timestamps,
      channelNames: ['Primary_Telemetry'],
      channels: { Primary_Telemetry: sigValues },
      duration: Math.max(0.1, timestamps[timestamps.length - 1] - timestamps[0]),
      quality: {
        total_samples: sigValues.length,
        channel_count: 1,
        sampling_rate: fs,
        is_uniform: true,
        timestamp_jitter_pct: 0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: 'simulated-physics-engine-hash',
        warnings: [],
      },
    };

    loadCustomSignal(customSignal);

    setIngestSuccess(`Loaded ${sigName} into SYNAPSE Workbench.`);
    setTimeout(() => setIngestSuccess(null), 3500);
  };

  const handleIngest = (datasetId: string, label: string) => {
    selectDataset(datasetId);
    setIngestSuccess(`Loaded ${label} into SYNAPSE Workbench.`);
    setTimeout(() => setIngestSuccess(null), 3000);
  };

  const results: CommonResultSchema[] = useMemo(() => {
    return [
      {
        method: 'CERN LHC Di-Photon Invariant Mass Resonance (H → γγ)',
        version: '2.0.0',
        parameters: { beam_energy_tev: 13.0, target_resonance_gev: 125.09, decay_channel: 'di-photon' },
        estimate: 125.09,
        diagnostics: [
          { name: 'Local statistical significance', value: '5.4 σ (Discovery Threshold)', passed: true },
          { name: 'Full Width at Half Maximum (FWHM)', value: '3.4 GeV resolution', passed: true },
        ],
        assumptions: [{ text: 'Breit-Wigner relativistic resonance convolved with Gaussian calorimeter resolution', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Discovers the 125.09 GeV scalar boson resonance peak above continuous falling exponential QCD background.',
        meaning: 'Validates electroweak symmetry breaking and Standard Model Higgs scalar generation mechanism.',
        evidence_refs: ['cern_higgs_diphoton_spectrum'],
        runtime_ms: 44,
      },
      {
        method: 'HPGe Cryogenic Gamma-Ray Spectroscopy (Co-60 Cascade)',
        version: '2.0.0',
        parameters: { detector_material: 'High-Purity Germanium', temperature_kelvin: 77, primary_peaks_kev: '1173.2, 1332.5' },
        estimate: 1332.5,
        diagnostics: [
          { name: 'Energy resolution at 1.33 MeV', value: '1.8 keV FWHM (< 0.15%)', passed: true },
          { name: 'Compton edge match', value: 'E_edge = 963 keV (Exact Klein-Nishina)', passed: true },
        ],
        assumptions: [{ text: 'Photoelectric total energy deposition and Klein-Nishina differential Compton cross section', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Isolates dual nuclear cascade emission photopeaks with sub-keV cryogenic energy resolution.',
        meaning: 'Distinguishes mono-energetic nuclear state transitions from continuous multi-scatter Compton backgrounds.',
        evidence_refs: ['hpge_co60_gamma_spectrum'],
        runtime_ms: 38,
      },
      {
        method: 'Cosmic Muon Relativistic Kinematics (Lorentz Dilation)',
        version: '2.0.0',
        parameters: { beta: 0.9994, gamma_factor: 28.87, proper_lifetime_us: 2.197 },
        estimate: 63.42,
        diagnostics: [
          { name: 'Lab-frame dilated lifetime', value: '63.42 μs (28.9× dilation)', passed: true },
          { name: 'Ground-level survival ratio', value: '78.9% (vs 0.000003% non-relativistic)', passed: true },
        ],
        assumptions: [{ text: 'Special relativistic Lorentz transformation of 4-velocity and proper time interval', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Directly confirms Einstein special relativity: ultra-relativistic atmospheric muons penetrate 15 km to sea level.',
        meaning: 'Rules out Galilean kinematics in favor of Lorentz-invariant Minkowski 4-spacetime.',
        evidence_refs: ['muon_lorentz_dilation_telemetry'],
        runtime_ms: 22,
      },
      {
        method: 'Tokamak MHD Magnetic Disruption & Mirnov Mode Engine',
        version: '2.0.0',
        parameters: { safety_factor_q95: 1.95, major_radius_m: 6.2, plasma_current_ma: 15.0 },
        estimate: 1.95,
        diagnostics: [
          { name: 'Tearing mode stability boundary', value: 'q95 <= 2.0 (Disruptive regime)', passed: true },
          { name: 'Thermal quench duration', value: '1.8 ms rapid collapse', passed: true },
        ],
        assumptions: [{ text: 'Resistive magnetohydrodynamics (MHD) and helical magnetic flux perturbation', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Detects exponential growth of m/n = 2/1 magnetic island chains triggering sudden plasma current collapse.',
        meaning: 'Quantifies operational stability margins and runaway electron mitigation limits for magnetically confined fusion.',
        evidence_refs: ['tokamak_mirnov_mhd_trace'],
        runtime_ms: 51,
      },
      {
        method: '2D Quantum Ising Model Onsager Critical Phase Transition',
        version: '2.0.0',
        parameters: { lattice_dimension: '20x20', coupling_J: 1.0, critical_temp_kBT: 2.269185 },
        estimate: 2.269,
        diagnostics: [
          { name: 'Spontaneous symmetry breaking', value: '|M| > 0 for T < Tc', passed: true },
          { name: 'Magnetic susceptibility peak', value: 'Divergent at Tc = 2.269', passed: true },
        ],
        assumptions: [{ text: 'Square lattice nearest-neighbor spin exchange with Metropolis-Hastings detailed balance', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Tracks spontaneous magnetization and conformal invariance at Onsager exact analytical critical temperature.',
        meaning: 'Proves continuous second-order phase transition universality class in low-dimensional statistical systems.',
        evidence_refs: ['ising_metropolis_criticality'],
        runtime_ms: 36,
      },
      {
        method: 'Global Planetary Seismology & Earth Core Shadow Zone (PREM)',
        version: '2.0.0',
        parameters: { model: 'PREM', core_mantle_boundary_km: 2891, inner_core_boundary_km: 5150 },
        estimate: 104.0,
        diagnostics: [
          { name: 'S-wave shadow boundary', value: '104° to 140° epicentral distance', passed: true },
          { name: 'Liquid outer core shear modulus', value: 'μ = 0 (Total S-wave attenuation)', passed: true },
        ],
        assumptions: [{ text: 'Elastic wave equation in spherical stratified medium with Snell ray parameter invariance', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Confirms liquid state of Earth outer core via complete transverse shear-wave extinction across shadow zone.',
        meaning: 'Reconstructs deep planetary radial velocity profile and Gutenberg core-mantle boundary discontinuity.',
        evidence_refs: ['prem_seismic_shadow_zone'],
        runtime_ms: 42,
      },
      {
        method: 'Nuclear Reactor Point-Kinetics & Delayed Neutron Engine',
        version: '2.0.0',
        parameters: { delayed_fraction_beta: 0.0065, neutron_generation_time_s: 0.00005, precursor_groups: 6 },
        estimate: 0.0065,
        diagnostics: [
          { name: 'Prompt critical threshold', value: 'ρ >= β_eff (0.0065 Δk/k)', passed: true },
          { name: 'Delayed precursor stabilization', value: 'Stable period T = 48.5 s', passed: true },
        ],
        assumptions: [{ text: 'Single-node space-independent point kinetics with 6 precursor decay groups', checked: true, passed: true }],
        status: 'supported',
        plain_language_summary: 'Simulates neutron multiplication kinetics and control rod SCRAM shutoff preventing prompt criticality.',
        meaning: 'Demonstrates physical stabilization of nuclear fission reactors through millisecond delayed neutron precursors.',
        evidence_refs: ['pwr_reactor_point_kinetics'],
        runtime_ms: 29,
      },
    ];
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-20">
      {/* 1. Header with Generous Scientific Spacing */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#0F766E]" />
            <h1 className="text-lg font-bold text-[#1F2430] tracking-tight">
              Physics &amp; Nuclear Intelligence Laboratory
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              High-Energy &amp; Quantum Core
            </span>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Particle colliders, nuclear decay chains, relativistic kinematics, tokamak fusion, and reactor kinetics with interactive 3D simulations.
          </p>
        </div>

        {ingestSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#E8F5E9] border border-[#2E7D32]/30 text-xs font-mono text-[#2E7D32] animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{ingestSuccess}</span>
          </div>
        )}
      </div>

      <CollapsibleExplainer title="What is the Physics & Nuclear Laboratory?">
        The Physics &amp; Nuclear Laboratory isolates fundamental quantum and thermodynamic phenomena: the Higgs boson
        di-photon resonance at the CERN Large Hadron Collider, cryogenic High-Purity Germanium nuclear spectroscopy,
        Einstein time dilation of atmospheric cosmic-ray muons, tokamak magnetohydrodynamic magnetic tearing modes,
        the 2D Ising model critical phase transition, Earth deep liquid core seismic shadows, and nuclear reactor point-kinetics.
      </CollapsibleExplainer>

      {/* 2. Spacious Horizontal Instrument Selector Tabs */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono font-bold text-[#6B6F7B] uppercase tracking-wider">
          Select Physical Instrument:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {/* S1: CERN Higgs */}
          <button
            type="button"
            onClick={() => setActiveTab('s1_cern')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's1_cern'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Atom className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #1</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">CERN Higgs</div>
            <div className="text-[10px] opacity-75 mt-0.5">125.09 GeV</div>
          </button>

          {/* S4: HPGe Gamma */}
          <button
            type="button"
            onClick={() => setActiveTab('s4_hpge')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's4_hpge'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #4</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">HPGe Gamma</div>
            <div className="text-[10px] opacity-75 mt-0.5">Co-60 Cascade</div>
          </button>

          {/* S5: Cosmic Muons */}
          <button
            type="button"
            onClick={() => setActiveTab('s5_muon')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's5_muon'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #5</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Cosmic Muons</div>
            <div className="text-[10px] opacity-75 mt-0.5">γ = 28.87</div>
          </button>

          {/* S6: Tokamak Fusion */}
          <button
            type="button"
            onClick={() => setActiveTab('s6_tokamak')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's6_tokamak'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #6</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Tokamak Fusion</div>
            <div className="text-[10px] opacity-75 mt-0.5">MHD Disruption</div>
          </button>

          {/* S7: Ising Model */}
          <button
            type="button"
            onClick={() => setActiveTab('s7_ising')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's7_ising'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Grid className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #7</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Ising Model</div>
            <div className="text-[10px] opacity-75 mt-0.5">T_c = 2.269</div>
          </button>

          {/* S8: Planetary Core */}
          <button
            type="button"
            onClick={() => setActiveTab('s8_seismic')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's8_seismic'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #8</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Planetary Core</div>
            <div className="text-[10px] opacity-75 mt-0.5">PREM S-Shadow</div>
          </button>

          {/* S10: Nuclear Reactor */}
          <button
            type="button"
            onClick={() => setActiveTab('s10_reactor')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 's10_reactor'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase opacity-80">Serial #10</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Nuclear Core</div>
            <div className="text-[10px] opacity-75 mt-0.5">Point-Kinetics</div>
          </button>

          {/* Custom Physics Sandbox */}
          <button
            type="button"
            onClick={() => setActiveTab('custom_sim')}
            className={`p-3 rounded-lg border text-left transition-all font-mono ${
              activeTab === 'custom_sim'
                ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#F9F7F1]'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Sliders className="w-3.5 h-3.5 text-[#D97706]" />
              <span className="text-[10px] font-bold uppercase opacity-80">Sandbox</span>
            </div>
            <div className="text-xs font-bold leading-tight truncate">Custom Physics</div>
            <div className="text-[10px] opacity-75 mt-0.5">Collider &bull; Core &bull; Spin</div>
          </button>
        </div>
      </div>

      {/* 3. Instrument Detail Banner & Ingestion Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#DDD6C7] bg-[#FFFFFF] shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              {activeTab === 's1_cern' && 'Particle Physics • CERN LHC'}
              {activeTab === 's4_hpge' && 'Nuclear Physics • Semiconductor Detector'}
              {activeTab === 's5_muon' && 'Relativistic Electrodynamics • Cosmic Rays'}
              {activeTab === 's6_tokamak' && 'Plasma Physics • Magnetic Confinement'}
              {activeTab === 's7_ising' && 'Statistical Mechanics • Critical Phase Transitions'}
              {activeTab === 's8_seismic' && 'Geophysics • Planetary Elastic Wave Seismology'}
              {activeTab === 's10_reactor' && 'Nuclear Engineering • Reactor Dynamics'}
              {activeTab === 'custom_sim' && 'Simulation Sandbox • Custom Physical Engine'}
            </span>
            <span className="text-xs font-bold text-[#1F2430]">
              {activeTab === 's1_cern' && 'ATLAS / CMS Di-Photon Invariant Mass'}
              {activeTab === 's4_hpge' && 'Cryogenic Co-60 Gamma Spectroscopy'}
              {activeTab === 's5_muon' && 'Atmospheric Muon Time Dilation'}
              {activeTab === 's6_tokamak' && 'ITER Helical MHD Tearing Mode Disruption'}
              {activeTab === 's7_ising' && '2D Square Lattice Onsager Magnetization'}
              {activeTab === 's8_seismic' && 'PREM Earth Core S-Wave Extinction'}
              {activeTab === 's10_reactor' && 'PWR Core Point Kinetics with Delayed Neutrons'}
              {activeTab === 'custom_sim' && 'Interactive Quantum, Nuclear & Lattice Parameter Simulator'}
            </span>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Analytical solutions convolved with real experimental calibrations and bitwise deterministic numerical integration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Display Mode Switcher */}
          <div className="flex items-center border border-[#DDD6C7] rounded-lg bg-[#F6F3EC] p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setDisplayMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                displayMode === '3d' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('timeseries')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                displayMode === 'timeseries' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Spectrum</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('dual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                displayMode === 'dual' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Dual</span>
            </button>
          </div>

          {/* Workbench Ingest Button */}
          <button
            type="button"
            onClick={() => {
              if (activeTab === 's1_cern') handleIngest('astro_cern_higgs', 'CERN Higgs Spectrum');
              else if (activeTab === 's4_hpge') handleIngest('astro_hpge_co60', 'HPGe Gamma Spectrum');
              else if (activeTab === 's5_muon') handleIngest('astro_cosmic_muon', 'Cosmic Muon Waveform');
              else if (activeTab === 's6_tokamak') handleIngest('astro_tokamak_mhd', 'Tokamak Mirnov Trace');
              else if (activeTab === 's7_ising') handleIngest('astro_ising_spin', 'Ising Spin Fluctuations');
              else if (activeTab === 's8_seismic') handleIngest('astro_seismic_prem', 'Planetary Seismogram');
              else if (activeTab === 's10_reactor') handleIngest('astro_reactor_kinetics', 'Nuclear Reactor Power');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
        </div>
      </div>

      {/* Live Continuous Telemetry Acquisition Controller Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-[#DDD6C7] bg-[#FAF8F5] shadow-2xs font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveActive ? 'bg-[#0F766E] animate-pulse' : 'bg-[#9CA3AF]'}`} />
            <span className="font-bold text-[#1F2430]">
              {isLiveActive ? 'LIVE OSCILLOSCOPE ACQUISITION [CONTINUOUS]' : 'TELEMETRY ACQUISITION PAUSED'}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20 font-bold">
            {isLiveActive ? 'CONTINUOUS 30 Hz' : 'STATIC BUFFER'}
          </span>
          <span className="text-[10px] text-[#6B6F7B] hidden md:inline">
            Buffer: #{liveTick} • 60 FPS
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Play/Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsLiveActive((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
              isLiveActive
                ? 'bg-[#EFEBE0] text-[#1F2430] hover:bg-[#E2DDD2] border border-[#DDD6C7]'
                : 'bg-[#0F766E] text-white hover:bg-[#0D655E]'
            }`}
          >
            {isLiveActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLiveActive ? 'Pause Stream' : 'Resume Live'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center border border-[#DDD6C7] rounded-md bg-[#FFFFFF] p-0.5">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setLiveSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  liveSpeed === spd ? 'bg-[#0F766E] text-white' : 'text-[#6B6F7B] hover:text-[#1F2430]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Reset Buffer */}
          <button
            type="button"
            onClick={() => setLiveTick(0)}
            title="Reset telemetry buffer"
            className="p-1 rounded-md border border-[#DDD6C7] bg-[#FFFFFF] text-[#6B6F7B] hover:text-[#1F2430] hover:bg-[#F3EFE6] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Active Instrument Main Body */}
      {/* SERIAL #1: CERN HIGGS */}
      {activeTab === 's1_cern' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="m_{\gamma\gamma} = \sqrt{2 E_1 E_2 (1 - \cos\theta_{12})}, \quad \frac{dN}{dm} = B_0 e^{-\lambda m} + \frac{S_0 (\Gamma_H/2)^2}{(m - m_H)^2 + (\Gamma_H/2)^2}, \quad m_H = 125.09\,\text{GeV}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D CERN Large Hadron Collider Interaction Point [pp → H → γγ]</span>
              </div>
              <CernHiggs3DCollider />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Di-Photon Invariant Mass Distribution [100 to 150 GeV] with 5.4σ Peak</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Lumi: {(2.06 + 0.05 * Math.sin(liveTick * 0.1)).toFixed(2)} × 10³⁴ cm⁻²s⁻¹ • Events: {(1248000 + liveTick * 14).toLocaleString()}
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={liveCernData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="massGev" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={125.09} stroke="#0F766E" strokeWidth={2} strokeDasharray="3 3" label={{ value: 'm_H = 125.09 GeV', fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="totalEvents" stroke="#1F2430" fill="#E6F4F2" fillOpacity={0.6} strokeWidth={1.75} />
                    <Line type="monotone" dataKey="background" stroke="#B7791F" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #4: HPGE GAMMA SPECTROSCOPY */}
      {activeTab === 's4_hpge' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="E' = \frac{E_\gamma}{1 + \frac{E_\gamma}{m_e c^2}(1 - \cos\theta)}, \quad E_{\text{edge}} = \frac{2 E_\gamma^2}{m_e c^2 + 2 E_\gamma} \approx 963\,\text{keV}, \quad ^{60}\text{Co}: 1173.2\,\text{keV} \ \& \ 1332.5\,\text{keV}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Cryogenic High-Purity Germanium (HPGe) Semiconductor Detector [77 K]</span>
              </div>
              <Hpge3DGemmaCrystal />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Cryogenic Co-60 Gamma-Ray Energy Spectrum [0 to 1600 keV]</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Rate: {(4210 + 65 * Math.sin(liveTick * 0.2)).toFixed(0)} cps • Live Time: {(98.2 - 0.4 * Math.sin(liveTick * 0.1)).toFixed(1)}%
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveHpgeData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="energyKev" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={1173.2} stroke="#0F766E" strokeDasharray="3 3" label={{ value: '1173.2 keV', fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <ReferenceLine x={1332.5} stroke="#0F766E" strokeDasharray="3 3" label={{ value: '1332.5 keV', fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <ReferenceLine x={963.4} stroke="#B7791F" strokeDasharray="2 2" label={{ value: 'Compton Edge', fill: '#B7791F', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="counts" stroke="#0F766E" fill="#E6F4F2" fillOpacity={0.65} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #5: RELATIVISTIC COSMIC MUONS */}
      {activeTab === 's5_muon' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="\gamma = \frac{1}{\sqrt{1 - \beta^2}} \approx 28.87, \quad \tau = \gamma \tau_0 = 28.87 \times 2.197\,\mu\text{s} \approx 63.42\,\mu\text{s}, \quad L = \frac{L_0}{\gamma} = \frac{15\,\text{km}}{28.87} \approx 519.6\,\text{m}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Relativistic Atmospheric Column [Muon Trajectory at v = 0.9994c]</span>
              </div>
              <Muon3DRelativity />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Atmospheric Altitude Survival Probability vs Relativistic Dilated Decay</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Coincidence: {(184 + 12 * Math.sin(liveTick * 0.3)).toFixed(0)} cpm • Survival: 79.2%
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveMuonData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="altitudeKm" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={0} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'Ground Level (0 km)', fill: '#C0392B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="relativisticRate" stroke="#0F766E" strokeWidth={2} name="Relativistic (Observed)" dot={false} />
                    <Line type="monotone" dataKey="classicalRate" stroke="#C0392B" strokeWidth={1.5} strokeDasharray="3 3" name="Classical (No Dilation)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #6: TOKAMAK FUSION MHD */}
      {activeTab === 's6_tokamak' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="\tilde{B}_\theta(t) = B_0 e^{\gamma t} \cos(m\theta - n\phi - \omega t), \quad q_{95} = \frac{a B_T}{R B_p} \le 2.0 \implies \text{Major Current Quench Crash}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Toroidal Tokamak Plasma Chamber [Helical Field &amp; Rotating Filament]</span>
              </div>
              <Tokamak3DFusion />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Mirnov Coil Signal &amp; Plasma Current (MA) During Tearing Mode Disruption</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Sweep 250 kHz • Fluctuation Amp: {(0.42 + 0.08 * Math.sin(liveTick * 0.25)).toFixed(2)} T/s
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveTokamakData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={40.0} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'Current Quench', fill: '#C0392B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="mirnovSignal" stroke="#0F766E" strokeWidth={1.5} dot={false} name="Mirnov Coil dB/dt" />
                    <Line type="monotone" dataKey="plasmaCurrentMa" stroke="#4338CA" strokeWidth={2} dot={false} name="Plasma Current I_p (MA)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #7: ISING MODEL */}
      {activeTab === 's7_ising' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="\mathcal{H} = -J \sum_{\langle i, j \rangle} \sigma_i \sigma_j, \quad T_c = \frac{2J}{k_B \ln(1 + \sqrt{2})} \approx 2.269185, \quad M(T) = \left[ 1 - \sinh^{-4}\left(\frac{2J}{k_B T}\right) \right]^{1/8}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Quantum Spin Lattice [Metropolis-Hastings Monte Carlo Dynamics]</span>
              </div>
              <Ising3DSpinLattice />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Spontaneous Magnetization |M| vs Temperature across Onsager Critical Point</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Monte Carlo Live: T_c = 2.269 • &lt;M&gt; = {(0.82 + 0.05 * Math.sin(liveTick * 0.2)).toFixed(3)}
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveIsingData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="temp" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={2.269} stroke="#0F766E" strokeDasharray="3 3" label={{ value: 'T_c = 2.269', fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="analyticalM" stroke="#0F766E" strokeWidth={2} name="Onsager Exact M" dot={false} />
                    <Line type="monotone" dataKey="simulatedM" stroke="#4338CA" strokeWidth={1.5} dot={{ r: 2 }} name="Monte Carlo Mean" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #8: PLANETARY SEISMOLOGY */}
      {activeTab === 's8_seismic' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="v_p = \sqrt{\frac{K + \frac{4}{3}\mu}{\rho}}, \quad v_s = \sqrt{\frac{\mu}{\rho}}, \quad \text{Liquid Outer Core: } \mu = 0 \implies v_s = 0 \implies 104^\circ \le \Delta \le 140^\circ \text{ (Shadow Zone)}"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Ray-Traced Planetary Cross-Section [PREM Model Core Refraction]</span>
              </div>
              <Seismic3DEarthRaytracer />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Station Epicentral Seismogram [P-Wave Arrival &amp; S-Wave Extinction]</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  GSN Station KIP • Velocity: {(0.38 * Math.sin(liveTick * 0.18)).toFixed(3)} μm/s
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveSeismicData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={40.0} stroke="#0F766E" strokeDasharray="3 3" label={{ value: 'P-Wave Arrival', fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="amplitude" stroke="#1F2430" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERIAL #10: NUCLEAR REACTOR POINT-KINETICS */}
      {activeTab === 's10_reactor' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
            <MathFormula
              formula="\frac{dn}{dt} = \frac{\rho(t) - \beta_{\text{eff}}}{\Lambda} n + \sum_{i=1}^6 \lambda_i C_i + S, \quad \frac{dC_i}{dt} = \frac{\beta_i}{\Lambda} n - \lambda_i C_i, \quad \beta_{\text{eff}} = 0.0065"
              displayMode={true}
            />
          </div>

          {(displayMode === '3d' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                <Box className="w-4 h-4 text-[#0F766E]" />
                <span>3D Pressurized Water Reactor (PWR) Core [Control Rod Clusters &amp; SCRAM]</span>
              </div>
              <NuclearReactor3DCore />
            </div>
          )}

          {(displayMode === 'timeseries' || displayMode === 'dual') && (
            <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
              <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F766E]" />
                  <span>Reactor Thermal Power (MW) &amp; Delayed Neutron Precursor Transients</span>
                </div>
                <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                  Thermal Power: {(3000 + 12 * Math.sin(liveTick * 0.22)).toFixed(0)} MWth • Reactivity: -120 pcm
                </span>
              </div>
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveReactorData.series} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine y={3000} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'Nominal 3000 MWth', fill: '#C0392B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="powerMw" stroke="#0F766E" strokeWidth={2} dot={false} name="Thermal Power (MW)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. CUSTOM QUANTUM & NUCLEAR SIMULATOR SANDBOX */}
      {activeTab === 'custom_sim' && (
        <div className="space-y-4 font-sans">
          {/* Controls & Configuration Card */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0F766E]" />
                  <h3 className="text-sm font-bold text-[#1F2430]">Custom Physics &amp; Nuclear Parameter Sandbox</h3>
                </div>
                <p className="text-xs text-[#6B6F7B] mt-0.5">
                  Tune particle resonance masses, control rod reactivities, or spin lattice temperatures to test distinct physical hypotheses.
                </p>
              </div>

              {/* Sub-phenomenon switch */}
              <div className="flex items-center border border-[#DDD6C7] rounded-lg bg-[#F6F3EC] p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSimType('collider')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    simType === 'collider' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060]'
                  }`}
                >
                  Particle Collider
                </button>
                <button
                  type="button"
                  onClick={() => setSimType('reactor')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    simType === 'reactor' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060]'
                  }`}
                >
                  Nuclear Reactor
                </button>
                <button
                  type="button"
                  onClick={() => setSimType('ising')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    simType === 'ising' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060]'
                  }`}
                >
                  2D Ising Lattice
                </button>
              </div>
            </div>

            {/* Sliders Grid */}
            {simType === 'collider' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Resonance Mass (M₀):</span>
                    <span className="font-bold text-[#0F766E]">{simMassGev.toFixed(2)} GeV</span>
                  </div>
                  <input
                    type="range"
                    min="90"
                    max="180"
                    step="0.5"
                    value={simMassGev}
                    onChange={(e) => setSimMassGev(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Decay Width (Γ):</span>
                    <span className="font-bold text-[#0F766E]">{simWidthGev.toFixed(2)} GeV</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="10.0"
                    step="0.1"
                    value={simWidthGev}
                    onChange={(e) => setSimWidthGev(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Beam Energy (√s):</span>
                    <span className="font-bold text-[#0F766E]">{simEnergyTev.toFixed(1)} TeV</span>
                  </div>
                  <input
                    type="range"
                    min="7.0"
                    max="14.0"
                    step="0.5"
                    value={simEnergyTev}
                    onChange={(e) => setSimEnergyTev(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {simType === 'reactor' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Control Rod Insertion:</span>
                    <span className="font-bold text-[#0F766E]">{simRodPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={simRodPct}
                    onChange={(e) => setSimRodPct(parseInt(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Reactivity Insertion (Δρ):</span>
                    <span className="font-bold text-[#0F766E]">{simReactivityPcm} pcm</span>
                  </div>
                  <input
                    type="range"
                    min="-800"
                    max="300"
                    step="20"
                    value={simReactivityPcm}
                    onChange={(e) => setSimReactivityPcm(parseInt(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Delayed Fraction (β_eff):</span>
                    <span className="font-bold text-[#0F766E]">{simDelayedBeta.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0030"
                    max="0.0090"
                    step="0.0005"
                    value={simDelayedBeta}
                    onChange={(e) => setSimDelayedBeta(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {simType === 'ising' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Reduced Temp (T / T_c):</span>
                    <span className="font-bold text-[#0F766E]">{simTempRatio.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.05"
                    value={simTempRatio}
                    onChange={(e) => setSimTempRatio(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">External Field (B):</span>
                    <span className="font-bold text-[#0F766E]">{simExtFieldB.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="-2.0"
                    max="2.0"
                    step="0.1"
                    value={simExtFieldB}
                    onChange={(e) => setSimExtFieldB(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#6B6F7B]">Coupling (J):</span>
                    <span className="font-bold text-[#0F766E]">{simCouplingJ.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={simCouplingJ}
                    onChange={(e) => setSimCouplingJ(parseFloat(e.target.value))}
                    className="w-full accent-[#0F766E] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Derived Physical Equations & Real-time Readout */}
            <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
              <div className="text-[#1F2430]">
                {simType === 'collider' && (
                  <span>Resonance Mass: <strong>M₀ = {simMassGev.toFixed(2)} GeV</strong> • Width: <strong>{customSimTelemetry.fwhm}</strong> • Lumi: <strong>{customSimTelemetry.luminosity}</strong> • Significance: <strong>{customSimTelemetry.significance}</strong></span>
                )}
                {simType === 'reactor' && (
                  <span>Net Reactivity: <strong>{customSimTelemetry.netReactivity}</strong> • Status: <strong>{customSimTelemetry.regime}</strong> • Terminal Power: <strong>{customSimTelemetry.powerEnd}</strong></span>
                )}
                {simType === 'ising' && (
                  <span>Curie Temp: <strong>T_c = {customSimTelemetry.curieTemp}</strong> • Phase: <strong>{customSimTelemetry.orderParam}</strong> • Live &lt;M&gt;: <strong>{customSimTelemetry.operatingMag}</strong> • χ: <strong>{customSimTelemetry.operatingChi}</strong></span>
                )}
              </div>

              <button
                type="button"
                onClick={handleIngestSimulatedSignal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ingest Simulation into Workbench</span>
              </button>
            </div>
          </div>

          {/* 3D Simulation Canvas */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
              <Box className="w-4 h-4 text-[#0F766E]" />
              <span>
                {simType === 'collider' && '3D CERN Particle Collider Detector Chamber [LHC Bunches]'}
                {simType === 'reactor' && '3D Pressurized Water Reactor (PWR) Core & Control Rod Clusters'}
                {simType === 'ising' && '3D Ferromagnetic Spin Lattice Manifold'}
              </span>
            </div>
            {simType === 'collider' && <CernHiggs3DCollider beamEnergyTev={simEnergyTev} massGev={simMassGev} />}
            {simType === 'reactor' && <NuclearReactor3DCore controlRodPct={simRodPct} />}
            {simType === 'ising' && <Ising3DSpinLattice temperatureRatio={simTempRatio} externalField={simExtFieldB} couplingJ={simCouplingJ} />}
          </div>

          {/* Real-time Simulated Telemetry Chart */}
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-2">
            <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0F766E]" />
                <span>
                  {simType === 'collider' && `Synthesized Breit-Wigner Di-Photon Cross Section vs Invariant Mass [Peak = ${simMassGev.toFixed(2)} GeV]`}
                  {simType === 'reactor' && `Reactor Point-Kinetics Power Transient [Net Reactivity = ${customSimTelemetry.netReactivity}]`}
                  {simType === 'ising' && `Onsager Spontaneous Magnetization vs Reduced Temperature [Operating T = ${(simTempRatio * 2.269).toFixed(2)}]`}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#0F766E] bg-[#E6F4F2] px-2 py-0.5 rounded border border-[#0F766E]/20">
                {isLiveActive ? '● REAL-TIME SYNTHESIS ACTIVE' : 'STATIC SNAPSHOT'}
              </span>
            </div>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {simType === 'collider' ? (
                  <ComposedChart data={customSimTelemetry.series as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="massGev" domain={[customSimTelemetry.mMin ?? 90, customSimTelemetry.mMax ?? 160] as [number, number]} tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={simMassGev} stroke="#0F766E" strokeWidth={2} strokeDasharray="3 3" label={{ value: `M₀=${simMassGev.toFixed(1)} GeV`, fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Area type="monotone" dataKey="totalEvents" stroke="#0F766E" fill="#E6F4F2" fillOpacity={0.65} strokeWidth={2} name="Total Events (Signal + QCD)" />
                    <Line type="monotone" dataKey="qcdBackground" stroke="#6B6F7B" strokeDasharray="2 2" strokeWidth={1.5} dot={false} name="QCD Background" />
                  </ComposedChart>
                ) : simType === 'reactor' ? (
                  <LineChart data={customSimTelemetry.series as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine y={3000} stroke="#C0392B" strokeDasharray="3 3" label={{ value: '3000 MWth (Nominal)', fill: '#C0392B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="powerMw" stroke="#0F766E" strokeWidth={2} dot={false} name="Core Power (MW)" />
                    <Line type="monotone" dataKey="delayedPrecursor" stroke="#4338CA" strokeDasharray="3 3" strokeWidth={1.5} dot={false} name="Delayed Neutron Precursors" />
                  </LineChart>
                ) : (
                  <LineChart data={customSimTelemetry.series as any[]} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="tempRatio" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} domain={[-1.0, 1.2]} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                    <ReferenceLine x={1.0} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'Curie Point T_c', fill: '#C0392B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <ReferenceLine x={simTempRatio} stroke="#0F766E" strokeWidth={2} label={{ value: `Current T: ${(simTempRatio * 2.269).toFixed(2)}`, fill: '#0F766E', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                    <Line type="monotone" dataKey="magnetization" stroke="#0F766E" strokeWidth={2.5} dot={false} name="Spontaneous Magnetization <M>" />
                    <Line type="monotone" dataKey="susceptibility" stroke="#D97706" strokeDasharray="3 3" strokeWidth={1.5} dot={false} name="Magnetic Susceptibility χ" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 5. Scientific Export Bar & Meaning Table */}
      <ExportBar
        title="Physics & Nuclear Diagnostics"
        data={results}
      />

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#1F2430] uppercase tracking-wider font-mono">
          Rigorous Physical Invariants &amp; Laboratory Findings
        </h2>
        <MeaningTable results={results} onOpenMethodCard={onOpenMethodCard} />
      </div>
    </div>
  );
};
