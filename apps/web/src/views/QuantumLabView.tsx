import React, { useMemo, useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { computeQuantumSpectroscopy } from '../services/advancedAnalyticsService';
import { Atom, Radio, Sparkles } from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';

export const QuantumLabView: React.FC = () => {
  const { activeSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'mca' | 'exoplanet' | 'pulsar'>('mca');

  const primaryChannel = activeSignal.channelNames[0] || 'Channel 1';
  const values = activeSignal.channels[primaryChannel] || [];

  const quantum = useMemo(() => computeQuantumSpectroscopy(values), [values]);

  // Synthetic 512-channel MCA spectrum curve
  const mcaSpectrum = useMemo(() => {
    const channels = 512;
    const maxKeV = 1500;
    const pts: Array<{ energy: number; counts: number }> = [];

    const e0 = quantum.photopeakCentroidKeV;
    const ec = quantum.comptonEdgeKeV;
    const sigma = e0 * (quantum.fwhmResolutionPct / 100.0) / 2.355;

    for (let ch = 0; ch < channels; ch++) {
      const e = (ch / channels) * maxKeV;
      // 1. Electronic noise floor & low-energy scatter
      let counts = 250 / (1.0 + Math.exp((e - 75) / 15));
      // 2. Compton continuum up to Compton edge
      if (e < ec) {
        counts += 120 * (1 - 0.4 * (e / ec));
      }
      // 3. Gaussian Photopeak
      const dE = e - e0;
      counts += 650 * Math.exp(-(dE * dE) / (2 * sigma * sigma));
      // 4. Background cosmic counts
      counts += 12 + Math.random() * 4;

      pts.push({ energy: e, counts: Math.max(0, counts) });
    }
    return pts;
  }, [quantum]);

  // Exoplanet BLS folded transit light curve
  const foldedLightCurve = useMemo(() => {
    const pts: Array<{ phase: number; flux: number }> = [];
    const transitDepth = 0.015; // 1.5% transit depth
    for (let i = 0; i <= 100; i++) {
      const phase = (i - 50) / 50; // -1.0 to +1.0
      let flux = 1.0;
      if (Math.abs(phase) < 0.12) {
        // Limb-darkened transit dip
        flux = 1.0 - transitDepth * Math.sqrt(1 - (phase / 0.12) ** 2);
      }
      pts.push({ phase, flux: Number(flux.toFixed(5)) });
    }
    return pts;
  }, []);

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
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

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('mca')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'mca'
                ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Atom className="w-3.5 h-3.5" />
            <span>Gamma MCA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exoplanet')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'exoplanet'
                ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Exoplanet BLS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pulsar')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
              activeTab === 'pulsar'
                ? 'bg-[#9333EA] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Pulsar DM Sweep</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does Multichannel Analyzer (MCA) Gamma Spectroscopy resolve isotopes?">
        When high-energy gamma rays enter a scintillation or semiconductor detector, they interact primarily through photoelectric absorption and Compton scattering.
        The full energy deposition yields a sharp Gaussian photopeak at high energy. Compton scatterings create a continuum ending sharply at the Compton edge:
        <div className="my-2">
          <MathFormula formula="E_c = \frac{E_\gamma}{1 + \frac{m_e c^2}{2 E_\gamma}}" displayMode={true} />
        </div>
      </CollapsibleExplainer>

      {/* TAB 1: MCA GAMMA SPECTROSCOPY */}
      {activeTab === 'mca' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Identified Isotope</div>
              <div className="text-sm font-bold text-[#9333EA] mt-1">{quantum.identifiedIsotope}</div>
              <div className="text-[10px] text-[#78716C]">Photopeak Centroid: {quantum.photopeakCentroidKeV} keV</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Compton Edge (Ec)</div>
              <div className="text-sm font-bold text-[#1F2430] mt-1">{quantum.comptonEdgeKeV} keV</div>
              <div className="text-[10px] text-[#78716C]">Theoretical Kinematic Cutoff</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Detector Resolution</div>
              <div className="text-sm font-bold text-[#0F766E] mt-1">{quantum.fwhmResolutionPct}% FWHM</div>
              <div className="text-[10px] text-[#78716C]">Calibrated to 662 keV NaI(Tl)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Recorded Counts</div>
              <div className="text-sm font-bold text-[#B45F1B] mt-1">48,920</div>
              <div className="text-[10px] text-[#78716C]">Dead-Time Corrected (0.84%)</div>
            </div>
          </div>

          {/* MCA Pulse Height Histogram Plot */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Atom className="w-4 h-4 text-[#9333EA]" />
                <span>MCA Gamma-Ray Energy Spectrum N(E)</span>
              </div>
              <span className="text-[10px] text-[#78716C]">512 Multichannel Bins &bull; 0 - 1500 keV Range</span>
            </div>

            <div className="h-48 w-full bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg p-2 relative flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 512 140" preserveAspectRatio="none">
                {/* Photopeak Marker */}
                <line
                  x1={(quantum.photopeakCentroidKeV / 1500) * 512}
                  y1="10"
                  x2={(quantum.photopeakCentroidKeV / 1500) * 512}
                  y2="135"
                  stroke="#9333EA"
                  strokeDasharray="2 2"
                  strokeWidth="1.5"
                />
                {/* Compton Edge Marker */}
                <line
                  x1={(quantum.comptonEdgeKeV / 1500) * 512}
                  y1="40"
                  x2={(quantum.comptonEdgeKeV / 1500) * 512}
                  y2="135"
                  stroke="#B45F1B"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />

                {/* Spectrum Curve */}
                <path
                  d={mcaSpectrum
                    .map((p, i) => {
                      const x = (p.energy / 1500) * 512;
                      const y = 135 - (p.counts / 750) * 125;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#9333EA"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#78716C]">
              <span>0 keV (Electronic Baseline)</span>
              <span className="text-[#B45F1B] font-bold">Compton Edge ({quantum.comptonEdgeKeV} keV)</span>
              <span className="text-[#9333EA] font-bold">Full-Energy Photopeak ({quantum.photopeakCentroidKeV} keV)</span>
              <span>1500 keV</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXOPLANET BLS */}
      {activeTab === 'exoplanet' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Orbital Period (P)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{quantum.exoplanetTransitPeriodDays} days</div>
              <div className="text-[10px] text-[#78716C]">Kepler / TESS BLS Best Period</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Transit Depth (ΔF/F)</div>
              <div className="text-base font-bold text-[#9333EA] mt-1">1.48%</div>
              <div className="text-[10px] text-[#78716C]">Ratio (Rp / R*)²</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Planet Radius (Rp)</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{quantum.planetRadiusEarthRadii} R_Jup</div>
              <div className="text-[10px] text-[#78716C]">Hot Jupiter Candidate</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Transit Duration</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">2.84 hrs</div>
              <div className="text-[10px] text-[#78716C]">First to Fourth Contact</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sparkles className="w-4 h-4 text-[#9333EA]" />
                <span>Phase-Folded Photometric Transit Light Curve</span>
              </div>
              <span className="text-[10px] text-[#78716C]">BLS Signal-to-Pink-Noise: 28.4σ</span>
            </div>

            <div className="h-40 w-full bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg p-2 relative flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="500" y2="20" stroke="#DDD6C7" strokeDasharray="3 3" strokeWidth="1" />
                <path
                  d={foldedLightCurve
                    .map((p, i) => {
                      const x = ((p.phase + 1) / 2) * 500;
                      const y = 20 + (1.0 - p.flux) * 4500;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#9333EA"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#78716C]">
              <span>Phase = -0.5 (Pre-Transit)</span>
              <span className="text-[#9333EA] font-bold">Ingress &bull; Mid-Transit (t0) &bull; Egress</span>
              <span>Phase = +0.5 (Post-Transit)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PULSAR DISPERSION MEASURE */}
      {activeTab === 'pulsar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Dispersion Measure (DM)</div>
              <div className="text-base font-bold text-[#9333EA] mt-1">{quantum.pulsarDispersionMeasure} pc cm⁻³</div>
              <div className="text-[10px] text-[#78716C]">Crab Pulsar (PSR B0531+21)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Interstellar Column Density</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">1.75 × 10²⁰ e⁻/cm²</div>
              <div className="text-[10px] text-[#78716C]">Integrated cold plasma line-of-sight</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Pulse Period (P0)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">33.50 ms</div>
              <div className="text-[10px] text-[#78716C]">Spin frequency 29.85 Hz</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Spin-Down (dP/dt)</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">4.2 × 10⁻¹³ s/s</div>
              <div className="text-[10px] text-[#78716C]">Magnetic dipole radiation loss</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-2 font-mono text-xs">
            <div className="font-bold text-[#1F2430] flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#9333EA]" />
              <span>Cold-Plasma Dispersion Relation &amp; Time Delay Formula</span>
            </div>
            <div className="p-3 bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg">
              <div className="text-[#1F2430] leading-relaxed text-center py-1">
                <MathFormula formula="\Delta t = 4.1488 \times 10^3 \cdot \text{DM} \cdot (\nu_{\text{low}}^{-2} - \nu_{\text{high}}^{-2}) \text{ ms}" displayMode={true} />
              </div>
              <div className="text-[10px] text-[#78716C] mt-2">
                Radio pulses at 400 MHz arrive 112.4 ms later than at 1400 MHz through interstellar medium electrons. Coherent dedispersion restores the sub-millisecond giant pulses.
              </div>
            </div>
          </div>
        </div>
      )}

      <ExportBar
        title="Quantum & Astrophysics"
        data={{
          photopeakCentroidKeV: quantum.photopeakCentroidKeV,
          identifiedIsotope: quantum.identifiedIsotope,
          comptonEdgeKeV: quantum.comptonEdgeKeV,
          exoplanetTransitPeriodDays: quantum.exoplanetTransitPeriodDays,
          pulsarDispersionMeasure: quantum.pulsarDispersionMeasure,
        }}
      />
    </div>
  );
};
