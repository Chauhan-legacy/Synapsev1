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
import { Ligo3DSpacetime } from '../components/astronomy/Ligo3DSpacetime';
import { Exoplanet3DTransit } from '../components/astronomy/Exoplanet3DTransit';
import { Pulsar3DLighthouse } from '../components/astronomy/Pulsar3DLighthouse';
import { Solar3DFlare } from '../components/astronomy/Solar3DFlare';
import { Orbit, Compass, Radio, Sun, Download, CheckCircle2, Box, Activity, Columns } from 'lucide-react';
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

export const AstronomyLabView: React.FC<AstronomyLabViewProps> = ({ onOpenMethodCard: _onOpenMethodCard }) => {
  const { selectDataset } = useSignal();
  const [activeTab, setActiveTab] = useState<'ligo' | 'kepler' | 'goes' | 'pulsar'>('ligo');
  const [displayMode, setDisplayMode] = useState<'3d' | 'timeseries' | 'dual'>('3d');
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Load Astrophysical Data
  const ligoData = useMemo(() => getLigoGwStrainData(), []);
  const keplerData = useMemo(() => getKeplerTransitData(), []);
  const goesData = useMemo(() => getGoesSolarFlareData(), []);
  const pulsarData = useMemo(() => getPulsarFoldingData(), []);

  // Ingest handler to load astrophysical signals into the primary workbench
  const handleIngestSignal = (type: 'ligo' | 'kepler' | 'goes' | 'pulsar') => {
    if (type === 'ligo') {
      selectDataset('astro_ligo_gw150914');
      setIngestSuccess('LIGO GW150914 Strain ingested into active workbench session.');
    } else if (type === 'kepler') {
      selectDataset('astro_kepler_transit');
      setIngestSuccess('Kepler-186f Exoplanet Photometry ingested into active session.');
    } else if (type === 'goes') {
      selectDataset('astro_goes_solar_flare');
      setIngestSuccess('NOAA GOES-16 Solar Flare Flux ingested into active session.');
    } else {
      selectDataset('astro_crab_pulsar');
      setIngestSuccess('Crab Pulsar PSR B0531+21 Radio Profile ingested into active session.');
    }

    setTimeout(() => setIngestSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans pb-16">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <h1 className="text-base font-bold text-[#1F2430]">
              Astronomy &amp; Cosmic Physical Observatories
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Astrophysics Suite
            </span>
          </div>
          <p className="text-xs text-[#6B6F7B] mt-0.5">
            Real gravitational-wave strain, exoplanet transit photometry, solar flare irradiance, and pulsar epoch-folding telemetry in interactive 3D.
          </p>
        </div>

        {/* Global Ingest Banner if successful */}
        {ingestSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#E8F5E9] border border-[#2E7D32]/30 text-xs font-mono text-[#2E7D32] animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{ingestSuccess}</span>
          </div>
        )}
      </div>

      <CollapsibleExplainer title="What is the SYNAPSE Astronomy Laboratory?">
        The Astronomy Laboratory brings authentic cosmic physical time-series data directly into the analytical workbench.
        Using open data standards from the Gravitational Wave Open Science Center (GWOSC), the NASA Exoplanet Archive, NOAA Space Weather
        Prediction Center, and Australia Telescope National Facility (ATNF), users can evaluate advanced spectral, topological,
        and causal algorithms on actual physical phenomena spanning colliding black holes, transiting exoplanets, and rotating neutron stars.
      </CollapsibleExplainer>

      {/* Astrophysical Navigation Tabs (NO EMOJIS, CLEAN PROFESSIONAL STYLE) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DDD6C7] pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ligo')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'ligo'
                ? 'bg-[#FFFFFF] border-t-2 border-t-[#0F766E] border-x border-[#DDD6C7] text-[#1F2430] shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Orbit className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>LIGO GW150914 Strain</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kepler')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'kepler'
                ? 'bg-[#FFFFFF] border-t-2 border-t-[#0F766E] border-x border-[#DDD6C7] text-[#1F2430] shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Kepler-186f Exoplanet Photometry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('goes')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'goes'
                ? 'bg-[#FFFFFF] border-t-2 border-t-[#0F766E] border-x border-[#DDD6C7] text-[#1F2430] shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>NOAA GOES-16 Solar Flare Flux</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pulsar')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-semibold rounded-t-md transition-colors whitespace-nowrap ${
              activeTab === 'pulsar'
                ? 'bg-[#FFFFFF] border-t-2 border-t-[#0F766E] border-x border-[#DDD6C7] text-[#1F2430] shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Crab Pulsar Radio Profile</span>
          </button>
        </div>

        {/* View Mode Switcher (3D vs Time Series vs Dual) */}
        <div className="flex items-center gap-1 rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-xs font-mono shrink-0">
          <button
            type="button"
            onClick={() => setDisplayMode('3d')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              displayMode === '3d'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Model</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('timeseries')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              displayMode === 'timeseries'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Time-Series</span>
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('dual')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              displayMode === 'dual'
                ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dual View</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LIGO GRAVITATIONAL WAVE STRAIN */}
      {activeTab === 'ligo' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs">
            {/* Header & Ingest Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
                    Spacetime Ripples
                  </span>
                  <h2 className="text-sm font-bold text-[#1F2430]">
                    LIGO GW150914 Binary Black Hole Merger Strain Streamer
                  </h2>
                </div>
                <p className="text-xs text-[#6B6F7B]">
                  Inspiral chirp, coalescence, and ringdown strain h(t) sampled at 4,096 Hz recorded by LIGO Hanford (H1) and Livingston (L1).
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleIngestSignal('ligo')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ingest into Workbench</span>
              </button>
            </div>

            {/* KaTeX Astrophysical Formula */}
            <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="text-[#1F2430] overflow-x-auto">
                <MathFormula
                  formula="h(t) = \frac{4}{r}\left(\frac{G\mathcal{M}}{c^2}\right)^{5/4}\left(\frac{c(t_c - t)}{5}\right)^{-1/4}\cos(2\phi(t)), \quad \mathcal{M} = \frac{(M_1 M_2)^{3/5}}{(M_1 + M_2)^{1/5}} = 28.1\,M_\odot"
                  displayMode={false}
                />
              </div>
              <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
                Chirp Mass M = 28.1 M_☉ • D_L = 410 Mpc
              </div>
            </div>

            {/* Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Peak Strain Amplitude</div>
                <div className="text-lg font-bold text-[#0F766E]">1.02 × 10⁻²¹</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Dimensionless strain</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Merger Frequency</div>
                <div className="text-lg font-bold text-[#4338CA]">250 Hz</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">ISCO boundary peak</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Component Masses</div>
                <div className="text-lg font-bold text-[#1F2430]">36 + 29 M_☉</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Binary black hole</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Energy Radiated</div>
                <div className="text-lg font-bold text-[#D97706]">3.0 M_☉ c²</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Pure gravitational waves</div>
              </div>
            </div>

            {/* 3D Physical Simulation */}
            {(displayMode === '3d' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>3D Spacetime Curvature &amp; Binary Black Hole Inspiral Canvas</span>
                </div>
                <Ligo3DSpacetime />
              </div>
            )}

            {/* Time-Series Observational Waveform */}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>Calibrated Hanford (H1) Strain Time-Series &amp; Chirp Envelope</span>
                </div>
                <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-2 relative shadow-2xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ligoData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <XAxis dataKey="timeMs" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                      <ReferenceLine y={0} stroke="#DDD6C7" />
                      <ReferenceLine x={380} stroke="#C0392B" strokeDasharray="3 3" label={{ value: 'Merger (t_c)', fill: '#C0392B', fontSize: 9 }} />
                      <Line type="monotone" dataKey="strain" stroke="#1F2430" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="envelope" stroke="#0F766E" strokeWidth={1.4} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono bg-[#FFFFFF]/90 px-2 py-0.5 rounded border border-[#DDD6C7]">
                    <span className="flex items-center gap-1.5 text-[#1F2430] font-bold">
                      <span className="w-2.5 h-1 bg-[#1F2430]" /> Strain h(t) [10⁻²¹]
                    </span>
                    <span className="flex items-center gap-1.5 text-[#0F766E] font-bold">
                      <span className="w-2.5 h-1 bg-[#0F766E]" /> Chirp Envelope
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#6B6F7B] px-1">
                  <span>Time (milliseconds) &rarr;</span>
                  <span>GWOSC Open Science Reference: Event GW150914 (Hanford H1 Observatory)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: KEPLER TRANSIT PHOTOMETRY */}
      {activeTab === 'kepler' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
                    Exoplanet Photometry
                  </span>
                  <h2 className="text-sm font-bold text-[#1F2430]">
                    Kepler-186f Exoplanet Transit Lightcurve Photometer
                  </h2>
                </div>
                <p className="text-xs text-[#6B6F7B]">
                  Limb-darkened planetary transit lightcurve of an Earth-sized exoplanet orbiting within the habitable zone of an M-dwarf star.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleIngestSignal('kepler')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ingest into Workbench</span>
              </button>
            </div>

            <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="text-[#1F2430] overflow-x-auto">
                <MathFormula
                  formula="\frac{\Delta F}{F} \approx \left(\frac{R_p}{R_*}\right)^2 = 5.4 \times 10^{-4} \quad (540\,\text{ppm}), \quad I(\mu) = I_0 [1 - u_1(1 - \mu) - u_2(1 - \mu)^2]"
                  displayMode={false}
                />
              </div>
              <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
                Transit Depth: 540 ppm • Radius R_p = 1.17 R_⊕
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Orbital Period</div>
                <div className="text-lg font-bold text-[#0F766E]">129.9 days</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Habitable zone</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Transit Duration</div>
                <div className="text-lg font-bold text-[#4338CA]">4.8 hours</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Ingress to egress</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Transit Depth (δ)</div>
                <div className="text-lg font-bold text-[#1F2430]">0.054%</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Flux drop (540 ppm)</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Host Star Type</div>
                <div className="text-lg font-bold text-[#D97706]">M1V Dwarf</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">T_eff = 3,755 K</div>
              </div>
            </div>

            {/* 3D Model */}
            {(displayMode === '3d' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>3D Kepler Star &amp; Planetary Transit Geometric Occultation Simulator</span>
                </div>
                <Exoplanet3DTransit />
              </div>
            )}

            {/* Observational Lightcurve */}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>NASA Kepler Space Telescope Calibrated Photometry</span>
                </div>
                <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-2 relative shadow-2xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={keplerData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <XAxis dataKey="timeHours" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                      <ReferenceLine y={1.0} stroke="#DDD6C7" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="observedFlux" stroke="#1F2430" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="transitModel" stroke="#0F766E" strokeWidth={2.0} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono bg-[#FFFFFF]/90 px-2 py-0.5 rounded border border-[#DDD6C7]">
                    <span className="flex items-center gap-1.5 text-[#1F2430] font-bold">
                      <span className="w-2.5 h-1 bg-[#1F2430]" /> Observed Flux (Kepler)
                    </span>
                    <span className="flex items-center gap-1.5 text-[#0F766E] font-bold">
                      <span className="w-2.5 h-1 bg-[#0F766E]" /> Mandel-Agol Model
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#6B6F7B] px-1">
                  <span>Time (hours from transit midpoint) &rarr;</span>
                  <span>NASA Exoplanet Archive Calibrated Telemetry: Kepler-186f</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: NOAA GOES SOLAR FLARE */}
      {activeTab === 'goes' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
                    Solar Telemetry
                  </span>
                  <h2 className="text-sm font-bold text-[#1F2430]">
                    NOAA GOES-16 Solar Flare X-Ray Flux Spectrograph
                  </h2>
                </div>
                <p className="text-xs text-[#6B6F7B]">
                  Continuous 1-minute solar irradiance telemetry recording M5.4 class solar eruption from Active Region AR3282.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleIngestSignal('goes')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ingest into Workbench</span>
              </button>
            </div>

            <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="text-[#1F2430] overflow-x-auto">
                <MathFormula
                  formula="I_{\text{GOES}} = \int_{0.1\,\text{nm}}^{0.8\,\text{nm}} F(\lambda, t)\,d\lambda, \quad \text{Class } M \ge 10^{-5}\,\text{W/m}^2, \quad \text{Class } X \ge 10^{-4}\,\text{W/m}^2"
                  displayMode={false}
                />
              </div>
              <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
                Peak Flux: 5.4 × 10⁻⁵ W/m² (M5.4 Class)
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Flare Classification</div>
                <div className="text-lg font-bold text-[#D97706]">Class M5.4</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Moderate solar flare</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Peak Radiated Power</div>
                <div className="text-lg font-bold text-[#0F766E]">54.0 μW/m²</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Long channel (0.1-0.8 nm)</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Active Region</div>
                <div className="text-lg font-bold text-[#1F2430]">AR 3282</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Complex magnetic loop</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Radio Blackout</div>
                <div className="text-lg font-bold text-[#4338CA]">R2 Moderate</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">HF communications impact</div>
              </div>
            </div>

            {/* 3D Coronal Arcade Simulation */}
            {(displayMode === '3d' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>3D Coronal Loop Magnetic Arcade &amp; Reconnection Eruption</span>
                </div>
                <Solar3DFlare />
              </div>
            )}

            {/* Observational GOES Flux Curve */}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>NOAA GOES-16 Dual-Channel Soft X-Ray Irradiance Profile</span>
                </div>
                <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-2 relative shadow-2xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={goesData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <XAxis dataKey="timeMin" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                      <ReferenceLine y={10.0} stroke="#D97706" strokeDasharray="3 3" label={{ value: 'M-Class Threshold', fill: '#D97706', fontSize: 9 }} />
                      <Area type="monotone" dataKey="longChannel" stroke="#1F2430" fill="rgba(15, 118, 110, 0.15)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="shortChannel" stroke="#D97706" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono bg-[#FFFFFF]/90 px-2 py-0.5 rounded border border-[#DDD6C7]">
                    <span className="flex items-center gap-1.5 text-[#1F2430] font-bold">
                      <span className="w-2.5 h-1 bg-[#1F2430]" /> X-Ray (0.1 - 0.8 nm) [μW/m²]
                    </span>
                    <span className="flex items-center gap-1.5 text-[#D97706] font-bold">
                      <span className="w-2.5 h-1 bg-[#D97706]" /> Short Channel (0.05 - 0.4 nm)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#6B6F7B] px-1">
                  <span>Time (minutes) &rarr;</span>
                  <span>NOAA Space Weather Prediction Center: GOES-16 Geostationary Operational Satellite</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CRAB PULSAR PULSE PROFILE */}
      {activeTab === 'pulsar' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
                    Radio Astronomy
                  </span>
                  <h2 className="text-sm font-bold text-[#1F2430]">
                    Crab Pulsar PSR B0531+21 Epoch-Folding Profiler
                  </h2>
                </div>
                <p className="text-xs text-[#6B6F7B]">
                  Coherently folded radio pulse profile over rotational phase [0, 1] for the Crab Nebula pulsar (P = 33.5 ms).
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleIngestSignal('pulsar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white hover:bg-[#0D655E] text-xs font-mono font-bold transition-colors shadow-2xs shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ingest into Workbench</span>
              </button>
            </div>

            <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="text-[#1F2430] overflow-x-auto">
                <MathFormula
                  formula="\Phi(t) = \frac{t - t_0}{P} - \frac{1}{2}\frac{\dot{P}}{P^2}(t - t_0)^2 \pmod 1, \quad P = 33.502858\,\text{ms}, \quad \text{DM} = 56.77\,\text{pc cm}^{-3}"
                  displayMode={false}
                />
              </div>
              <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
                Period P = 33.50 ms • Spindown P_dot = 4.2 × 10⁻¹³ s/s
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Rotation Rate</div>
                <div className="text-lg font-bold text-[#0F766E]">29.85 Hz</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">30 revolutions/sec</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Dispersion Measure</div>
                <div className="text-lg font-bold text-[#4338CA]">56.77 pc/cm³</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Interstellar plasma lag</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Epoch-Folding χ²</div>
                <div className="text-lg font-bold text-[#1F2430]">489.2</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Phase dispersion stat</div>
              </div>
              <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
                <div className="text-[10px] uppercase text-[#6B6F7B]">Surface Magnetic Field</div>
                <div className="text-lg font-bold text-[#D97706]">3.78 × 10¹² G</div>
                <div className="text-[10px] text-[#6B6F7B] mt-0.5">Dipolar magnetic field</div>
              </div>
            </div>

            {/* 3D Relativistic Lighthouse Model */}
            {(displayMode === '3d' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Box className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>3D Relativistic Neutron Star &amp; Synchrotron Lighthouse Beam Canvas</span>
                </div>
                <Pulsar3DLighthouse />
              </div>
            )}

            {/* Observational Epoch Folded Curve */}
            {(displayMode === 'timeseries' || displayMode === 'dual') && (
              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#1F2430] flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span>ATNF Coherently Folded Radio Pulse Intensity Profile</span>
                </div>
                <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-2 relative shadow-2xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pulsarData.series} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <XAxis dataKey="phase" tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <YAxis tick={{ fill: '#6B6F7B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                      <ReferenceLine y={0.12} stroke="#6B6F7B" strokeDasharray="3 3" label={{ value: 'Noise Floor', fill: '#6B6F7B', fontSize: 9 }} />
                      <Line type="monotone" dataKey="intensity" stroke="#1F2430" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 right-3 flex items-center gap-3 text-[10px] font-mono bg-[#FFFFFF]/90 px-2 py-0.5 rounded border border-[#DDD6C7]">
                    <span className="flex items-center gap-1.5 text-[#1F2430] font-bold">
                      <span className="w-2.5 h-1 bg-[#1F2430]" /> Radio Pulse Intensity (Main &amp; Interpulse)
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#6B6F7B] px-1">
                  <span>Rotational Phase Φ ∈ [0, 1] &rarr;</span>
                  <span>ATNF Pulsar Catalogue: PSR B0531+21 (Crab Nebula, Supernova SN 1054)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
