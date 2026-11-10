import React, { useState, useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { MathFormula } from '../components/common/MathFormula';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import {
  getLigoGwStrainData,
  getKeplerTransitData,
  getGoesSolarFlareData,
  getPulsarFoldingData,
} from '../services/astronomyService';
import {
  getCernHiggsData,
  getCmbSpectrumData,
  getFrbData,
  getHpgeNuclearData,
  getMuonRelativityData,
  getTokamakMhdData,
  getIsingModelData,
  getSeismicPremData,
  getKerrShadowData,
  getReactorKineticsData,
} from '../services/physicsSuiteService';

// 3D Visualizer Engines
import { Ligo3DSpacetime } from '../components/astronomy/Ligo3DSpacetime';
import { Exoplanet3DTransit } from '../components/astronomy/Exoplanet3DTransit';
import { Pulsar3DLighthouse } from '../components/astronomy/Pulsar3DLighthouse';
import { Solar3DFlare } from '../components/astronomy/Solar3DFlare';
import { CernHiggs3DCollider } from '../components/physics/CernHiggs3DCollider';
import { Cmb3DSphere } from '../components/physics/Cmb3DSphere';
import { Frb3DWaterfall } from '../components/physics/Frb3DWaterfall';
import { Hpge3DGemmaCrystal } from '../components/physics/Hpge3DGemmaCrystal';
import { Muon3DRelativity } from '../components/physics/Muon3DRelativity';
import { Tokamak3DFusion } from '../components/physics/Tokamak3DFusion';
import { Ising3DSpinLattice } from '../components/physics/Ising3DSpinLattice';
import { Seismic3DEarthRaytracer } from '../components/physics/Seismic3DEarthRaytracer';
import { KerrBlackHole3DRaytracer } from '../components/physics/KerrBlackHole3DRaytracer';
import { NuclearReactor3DCore } from '../components/physics/NuclearReactor3DCore';

import {
  Orbit,
  Compass,
  Radio,
  Sun,
  Download,
  CheckCircle2,
  Box,
  Activity,
  Columns,
  Atom,
  Globe,
  Flame,
  Shield,
  Clock,
  Layers,
  Zap,
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
} from 'recharts';

interface AstronomyLabViewProps {
  onOpenMethodCard?: (name: string) => void;
}

export type ObservatoryTab =
  | 'ligo'
  | 'kepler'
  | 'goes'
  | 'pulsar'
  | 's1_cern'
  | 's2_cmb'
  | 's3_frb'
  | 's4_hpge'
  | 's5_muon'
  | 's6_tokamak'
  | 's7_ising'
  | 's8_seismic'
  | 's9_kerr'
  | 's10_reactor';

export const AstronomyLabView: React.FC<AstronomyLabViewProps> = ({ onOpenMethodCard: _onOpenMethodCard }) => {
  const { selectDataset } = useSignal();
  const [activeTab, setActiveTab] = useState<ObservatoryTab>('ligo');
  const [displayMode, setDisplayMode] = useState<'3d' | 'timeseries' | 'dual'>('3d');
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Astrophysics Telemetry
  const ligoData = useMemo(() => getLigoGwStrainData(), []);
  const keplerData = useMemo(() => getKeplerTransitData(), []);
  const goesData = useMemo(() => getGoesSolarFlareData(), []);
  const pulsarData = useMemo(() => getPulsarFoldingData(), []);

  // Physics Suite Serials 1-10 Telemetry
  const cernData = useMemo(() => getCernHiggsData(), []);
  const cmbData = useMemo(() => getCmbSpectrumData(), []);
  const frbData = useMemo(() => getFrbData(), []);
  const hpgeData = useMemo(() => getHpgeNuclearData(), []);
  const muonData = useMemo(() => getMuonRelativityData(), []);
  const tokamakData = useMemo(() => getTokamakMhdData(), []);
  const isingData = useMemo(() => getIsingModelData(), []);
  const seismicData = useMemo(() => getSeismicPremData(), []);
  const kerrData = useMemo(() => getKerrShadowData(), []);
  const reactorData = useMemo(() => getReactorKineticsData(), []);

  // Ingest handler
  const handleIngest = (tab: ObservatoryTab) => {
    if (tab === 'ligo') selectDataset('astro_ligo_gw150914');
    else if (tab === 'kepler') selectDataset('astro_kepler_transit');
    else if (tab === 'goes') selectDataset('astro_goes_solar_flare');
    else if (tab === 'pulsar') selectDataset('astro_crab_pulsar');
    else selectDataset('benchmark_ALL');

    setIngestSuccess(`Telemetry from ${tab.toUpperCase()} ingested into analytical workbench.`);
    setTimeout(() => setIngestSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <h1 className="text-base font-bold text-[#1F2430]">
              Physical &amp; Quantum Observatories Laboratory
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Serials #1 – #10 Complete
            </span>
          </div>
          <p className="text-xs text-[#6B6F7B] mt-0.5">
            Real gravitational-wave strain, exoplanet photometry, Higgs Boson invariant mass, CMB multipoles, FRBs, HPGe nuclear cascades, and tokamak fusion in interactive 3D.
          </p>
        </div>

        {ingestSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E8F5E9] border border-[#2E7D32]/30 text-xs font-mono text-[#2E7D32] animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{ingestSuccess}</span>
          </div>
        )}
      </div>

      <CollapsibleExplainer title="What is the Physical & Quantum Observatories Laboratory?">
        The Physical Observatories Laboratory unifies real empirical telemetry and theoretical physics engines across
        cosmology, particle colliders, nuclear decay, fusion tokamaks, and general relativity. All instruments feature full 3D interactive
        vector projections, KaTeX theoretical proofs, real open science data archives (CERN, ESA Planck, CHIME, NOAA SWPC, ATNF, NNDC, PREM),
        and single-click ingestion into the SYNAPSE Multi-Tool Rack.
      </CollapsibleExplainer>

      {/* Navigation Tabs Bar with Domain Categorization */}
      <div className="space-y-2 border-b border-[#DDD6C7] pb-2">
        {/* Category 1: Cosmic & Astrophysics Observatories */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          <span className="text-[10px] font-bold text-[#6B6F7B] uppercase px-1.5">Astro:</span>
          <button
            type="button"
            onClick={() => setActiveTab('ligo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 'ligo' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Orbit className="w-3 h-3" />
            <span>LIGO GW150914</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kepler')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 'kepler' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Kepler-186f</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('goes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 'goes' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span>GOES-16 Flare</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pulsar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 'pulsar' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Crab Pulsar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('s2_cmb')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 's2_cmb' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>#2 CMB Planck</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('s3_frb')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 's3_frb' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>#3 FRB Dispersion</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('s9_kerr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              activeTab === 's9_kerr' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Orbit className="w-3 h-3" />
            <span>#9 Kerr Shadow</span>
          </button>
        </div>

        {/* Category 2: Nuclear & High-Energy Physics Serials */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            <span className="text-[10px] font-bold text-[#6B6F7B] uppercase px-1.5">Physics &amp; Nuclear:</span>
            <button
              type="button"
              onClick={() => setActiveTab('s1_cern')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's1_cern' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Atom className="w-3 h-3" />
              <span>#1 CERN Higgs</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s4_hpge')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's4_hpge' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>#4 HPGe Gamma</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s5_muon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's5_muon' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>#5 Muon Decay</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s6_tokamak')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's6_tokamak' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>#6 Tokamak Fusion</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s7_ising')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's7_ising' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>#7 Ising Model</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s8_seismic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's8_seismic' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>#8 Planetary Core</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('s10_reactor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === 's10_reactor' ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>#10 Nuclear Reactor</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-xs font-mono shrink-0">
            <button
              type="button"
              onClick={() => setDisplayMode('3d')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                displayMode === '3d' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Model</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('timeseries')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                displayMode === 'timeseries' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Spectrum</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('dual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                displayMode === 'dual' ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Dual</span>
            </button>
          </div>
        </div>
      </div>

      {/* RENDER CURRENT ACTIVE OBSERVATORY INSTRUMENT */}
      <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
        {/* Dynamic Header & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
                {activeTab.startsWith('s') ? 'Advanced Physics Suite' : 'Cosmic Observatory'}
              </span>
              <h2 className="text-sm font-bold text-[#1F2430]">
                {activeTab === 'ligo' && 'LIGO GW150914 Binary Black Hole Merger Strain Streamer'}
                {activeTab === 'kepler' && 'Kepler-186f Exoplanet Transit Photometer'}
                {activeTab === 'goes' && 'NOAA GOES-16 Solar Flare X-Ray Flux Spectrograph'}
                {activeTab === 'pulsar' && 'Crab Pulsar PSR B0531+21 Epoch-Folding Profiler'}
                {activeTab === 's1_cern' && 'Serial #1: CERN LHC Di-Photon Higgs Boson Invariant Mass Spectrometer'}
                {activeTab === 's2_cmb' && 'Serial #2: Planck Cosmic Microwave Background (CMB) Angular Power Spectrum'}
                {activeTab === 's3_frb' && 'Serial #3: Fast Radio Burst (FRB) Plasma Dispersion & Dedispersion Engine'}
                {activeTab === 's4_hpge' && 'Serial #4: High-Purity Germanium (HPGe) Nuclear Gamma-Ray Spectroscopy'}
                {activeTab === 's5_muon' && 'Serial #5: Relativistic Cosmic-Ray Atmospheric Muon Time-Dilation Decay Profiler'}
                {activeTab === 's6_tokamak' && 'Serial #6: Tokamak Magnetohydrodynamic (MHD) Disruptions & Mirnov Coils'}
                {activeTab === 's7_ising' && 'Serial #7: 2D Quantum Ising Model Onsager Critical Phase Transition'}
                {activeTab === 's8_seismic' && 'Serial #8: Global Planetary Seismology & PREM Earth Core Raytracer'}
                {activeTab === 's9_kerr' && 'Serial #9: Kerr Spacetime Gravitational Lensing & Black Hole Shadow Geodesics'}
                {activeTab === 's10_reactor' && 'Serial #10: Nuclear Reactor Core Point-Kinetics & Delayed Neutron Model'}
              </h2>
            </div>
            <p className="text-xs text-[#6B6F7B]">
              Rigorous empirical telemetry and analytical solutions calibrated against published open-science benchmarks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleIngest(activeTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
        </div>

        {/* Dynamic KaTeX Formulas */}
        <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="text-[#1F2430] overflow-x-auto">
            {activeTab === 'ligo' && (
              <MathFormula formula="h(t) = \frac{4}{r}\left(\frac{G\mathcal{M}}{c^2}\right)^{5/4}\left(\frac{c(t_c - t)}{5}\right)^{-1/4}\cos(2\phi(t)), \quad \mathcal{M} = 28.1\,M_\odot" displayMode={false} />
            )}
            {activeTab === 'kepler' && (
              <MathFormula formula="\frac{\Delta F}{F} \approx \left(\frac{R_p}{R_*}\right)^2 = 540\,\text{ppm}, \quad I(\mu) = I_0[1 - u_1(1-\mu) - u_2(1-\mu)^2]" displayMode={false} />
            )}
            {activeTab === 'goes' && (
              <MathFormula formula="I_{\text{GOES}} = \int_{0.1\,\text{nm}}^{0.8\,\text{nm}} F(\lambda, t)\,d\lambda, \quad \text{Class M5.4} = 5.4 \times 10^{-5}\,\text{W/m}^2" displayMode={false} />
            )}
            {activeTab === 'pulsar' && (
              <MathFormula formula="\Phi(t) = \frac{t - t_0}{P} - \frac{1}{2}\frac{\dot{P}}{P^2}(t - t_0)^2 \pmod 1, \quad P = 33.502858\,\text{ms}" displayMode={false} />
            )}
            {activeTab === 's1_cern' && (
              <MathFormula formula="m_{\gamma\gamma} = \sqrt{2 E_1 E_2 (1 - \cos\theta_{12})}, \quad m_H = 125.09 \pm 0.24\,\text{GeV}, \quad Z = 6.5\sigma" displayMode={false} />
            )}
            {activeTab === 's2_cmb' && (
              <MathFormula formula="\frac{\Delta T}{T}(\hat{n}) = \sum_{\ell m} a_{\ell m} Y_{\ell m}(\hat{n}), \quad C_\ell = \frac{1}{2\ell+1}\sum_m |a_{\ell m}|^2, \quad \ell_1 = 220.6" displayMode={false} />
            )}
            {activeTab === 's3_frb' && (
              <MathFormula formula="\Delta t = \frac{e^2}{2\pi m_e c}\left(\nu_1^{-2} - \nu_2^{-2}\right)\text{DM}, \quad \text{DM} = \int n_e\,ds = 348.8\,\text{pc cm}^{-3}" displayMode={false} />
            )}
            {activeTab === 's4_hpge' && (
              <MathFormula formula="E_{\text{edge}} = E_\gamma \left(1 - \frac{1}{1 + \frac{2 E_\gamma}{m_e c^2}}\right) = 963.4\,\text{keV}, \quad \text{Co-60: } 1173.2\,\&\,1332.5\,\text{keV}" displayMode={false} />
            )}
            {activeTab === 's5_muon' && (
              <MathFormula formula="\Delta t_{\text{lab}} = \gamma \tau_0, \quad \gamma = \frac{1}{\sqrt{1 - v^2/c^2}} = 29.3, \quad \tau_0 = 2.19698\,\mu\text{s}" displayMode={false} />
            )}
            {activeTab === 's6_tokamak' && (
              <MathFormula formula="\Delta^* \psi = -\mu_0 R^2 p'(\psi) - F F', \quad q(r) = \frac{m}{n} = 2.01, \quad \dot{B}_\theta = -\frac{\partial \Phi}{\partial t}" displayMode={false} />
            )}
            {activeTab === 's7_ising' && (
              <MathFormula formula="\sinh\left(\frac{2 J}{k_B T_c}\right) = 1 \implies \frac{k_B T_c}{J} \approx 2.269185, \quad M(T) = \left[1 - \sinh^{-4}\left(\frac{2J}{kT}\right)\right]^{1/8}" displayMode={false} />
            )}
            {activeTab === 's8_seismic' && (
              <MathFormula formula="T(p) = 2 \int_{r_{\text{bot}}}^R \frac{r\,dr}{v(r)\sqrt{r^2 - p^2 v^2}}, \quad \text{S-Wave Shadow: } 104^\circ \dots 140^\circ \implies v_s = 0" displayMode={false} />
            )}
            {activeTab === 's9_kerr' && (
              <MathFormula formula="r_+ = M + \sqrt{M^2 - a^2}, \quad r_{\text{ph}} = 2M\left[1 + \cos\left(\frac{2}{3}\arccos(-a/M)\right)\right] = 1.39\,M" displayMode={false} />
            )}
            {activeTab === 's10_reactor' && (
              <MathFormula formula="\frac{dn}{dt} = \frac{\rho - \beta}{\Lambda}n + \sum_{i=1}^6 \lambda_i C_i, \quad \frac{dC_i}{dt} = \frac{\beta_i}{\Lambda}n - \lambda_i C_i, \quad \beta = 0.0065" displayMode={false} />
            )}
          </div>
        </div>

        {/* 3D Visualizer Model Section */}
        {(displayMode === '3d' || displayMode === 'dual') && (
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
              <Box className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Interactive 3D Physical Geometry &amp; Vector Projection Engine</span>
            </div>
            {activeTab === 'ligo' && <Ligo3DSpacetime />}
            {activeTab === 'kepler' && <Exoplanet3DTransit />}
            {activeTab === 'goes' && <Solar3DFlare />}
            {activeTab === 'pulsar' && <Pulsar3DLighthouse />}
            {activeTab === 's1_cern' && <CernHiggs3DCollider />}
            {activeTab === 's2_cmb' && <Cmb3DSphere />}
            {activeTab === 's3_frb' && <Frb3DWaterfall />}
            {activeTab === 's4_hpge' && <Hpge3DGemmaCrystal />}
            {activeTab === 's5_muon' && <Muon3DRelativity />}
            {activeTab === 's6_tokamak' && <Tokamak3DFusion />}
            {activeTab === 's7_ising' && <Ising3DSpinLattice />}
            {activeTab === 's8_seismic' && <Seismic3DEarthRaytracer />}
            {activeTab === 's9_kerr' && <KerrBlackHole3DRaytracer />}
            {activeTab === 's10_reactor' && <NuclearReactor3DCore />}
          </div>
        )}

        {/* Time-Series / Spectral Telemetry Curve Section */}
        {(displayMode === 'timeseries' || displayMode === 'dual') && (
          <div className="space-y-1">
            <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Calibrated Observational Telemetry &amp; Analytical Solution</span>
            </div>

            <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-2 relative shadow-2xs font-mono">
              <ResponsiveContainer width="100%" height="100%">
                {activeTab === 'ligo' ? (
                  <LineChart data={ligoData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="strain" stroke="#1F2430" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="envelope" stroke="#0F766E" strokeWidth={1.4} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 'kepler' ? (
                  <LineChart data={keplerData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeHours" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <ReferenceLine y={1.0} stroke="#DDD6C7" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="observedFlux" stroke="#1F2430" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="transitModel" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 'goes' ? (
                  <AreaChart data={goesData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeMinutes" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <ReferenceLine y={10.0} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'M-Class', fill: '#D97706', fontSize: 9 }} />
                    <Area type="monotone" dataKey="longChannel" stroke="#1F2430" fill="rgba(15, 118, 110, 0.15)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="shortChannel" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </AreaChart>
                ) : activeTab === 'pulsar' ? (
                  <LineChart data={pulsarData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="phase" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="intensity" stroke="#0F766E" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's1_cern' ? (
                  <LineChart data={cernData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="massGev" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <ReferenceLine x={125.09} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'm_H = 125.09 GeV', fill: '#C0392B', fontSize: 9 }} />
                    <Line type="monotone" dataKey="observedEvents" stroke="#1F2430" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="backgroundFit" stroke="#0F766E" strokeWidth={1.8} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's2_cmb' ? (
                  <LineChart data={cmbData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="multipoleL" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="clMicroK2" stroke="#1F2430" strokeWidth={1.6} dot={true} isAnimationActive={false} />
                    <Line type="monotone" dataKey="lcdmTheoretical" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's3_frb' ? (
                  <LineChart data={frbData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="freqMhz" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="arrivalDelayMs" stroke="#D97706" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's4_hpge' ? (
                  <LineChart data={hpgeData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="energyKev" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="counts" stroke="#0F766E" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's5_muon' ? (
                  <LineChart data={muonData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeMicroSec" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="muonsLabFrame" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="muonsRestFrame" stroke="#C0392B" strokeWidth={1.6} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's6_tokamak' ? (
                  <LineChart data={tokamakData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="plasmaCurrentMa" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="mirnovVoltageV" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's7_ising' ? (
                  <LineChart data={isingData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="temperatureT" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <ReferenceLine x={2.269} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'T_c = 2.269', fill: '#C0392B', fontSize: 9 }} />
                    <Line type="monotone" dataKey="magnetizationM" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="heatCapacityC" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's8_seismic' ? (
                  <LineChart data={seismicData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="depthKm" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <ReferenceLine x={2891} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'CMB (2,891 km)', fill: '#C0392B', fontSize: 9 }} />
                    <Line type="monotone" dataKey="pWaveVelocityKms" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="sWaveVelocityKms" stroke="#4338CA" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : activeTab === 's9_kerr' ? (
                  <LineChart data={kerrData.series.filter((_, idx) => idx % 8 === 0)} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="impactParameterAlpha" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="intensity" stroke="#D97706" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <LineChart data={reactorData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                    <XAxis dataKey="timeSec" tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#6B6F7B', fontSize: 9 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="neutronFluxRelative" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="reactivityDollars" stroke="#C0392B" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
