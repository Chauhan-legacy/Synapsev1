import React, { useMemo, useState } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { computeEarthSystems } from '../services/advancedAnalyticsService';
import { Waves, Activity, Globe } from 'lucide-react';

export const EarthSystemsLabView: React.FC = () => {
  const { activeSignal } = useSignal();
  const [activeTab, setActiveTab] = useState<'tides' | 'seismic' | 'geomagnetic'>('tides');

  const primaryChannel = activeSignal.channelNames[0] || 'Channel 1';
  const values = activeSignal.channels[primaryChannel] || [];
  const fs = activeSignal.samplingRate;

  const earth = useMemo(() => computeEarthSystems(values, fs), [values, fs]);

  // Generate synthetic ocean tidal harmonic curve
  const tidalCurve = useMemo(() => {
    const pts: Array<{ t: number; height: number }> = [];
    const hours = 48; // 2-day tidal cycle
    for (let h = 0; h <= hours; h += 0.5) {
      // M2 (12.42h), S2 (12.00h), K1 (23.93h), O1 (25.82h)
      const wM2 = (2 * Math.PI) / 12.4206;
      const wS2 = (2 * Math.PI) / 12.0000;
      const wK1 = (2 * Math.PI) / 23.9345;
      const wO1 = (2 * Math.PI) / 25.8193;

      const eta =
        earth.m2Amplitude * Math.cos(wM2 * h) +
        earth.s2Amplitude * Math.cos(wS2 * h + 0.3) +
        earth.k1Amplitude * Math.cos(wK1 * h - 0.5) +
        earth.o1Amplitude * Math.cos(wO1 * h + 1.1);

      pts.push({ t: h, height: Number(eta.toFixed(3)) });
    }
    return pts;
  }, [earth]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
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
            Geophysical telemetry: Doodson harmonic tidal constituents ($M_2, S_2, K_1, O_1$), Allen STA/LTA seismic event detection, and planetary geomagnetic disturbances.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('tides')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'tides'
                ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
              }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Ocean Tides</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seismic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'seismic'
                ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Seismic STA/LTA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('geomagnetic')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${activeTab === 'geomagnetic'
                ? 'bg-[#0284C7] text-white font-bold shadow-2xs'
                : 'text-[#57534E] hover:text-[#1F2430]'
              }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Geomagnetic Storms</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does Doodson Harmonic Decomposition model global ocean tides?">
        Gravitational tidal potential from the Moon and Sun is decomposed via celestial mechanics into discrete harmonic constituents.
        The semidiurnal components $M_2$ (lunar principal, 12.42h) and $S_2$ (solar principal, 12.00h) dictate spring-neap tidal modulation.
        Diurnal constituents $K_1$ (luni-solar declination, 23.93h) and $O_1$ (lunar principal diurnal, 25.82h) govern diurnal inequalities across ocean basins.
      </CollapsibleExplainer>

      {/* TAB 1: OCEAN TIDES */}
      {activeTab === 'tides' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Principal Lunar (M₂)</div>
              <div className="text-base font-bold text-[#0284C7] mt-1">{earth.m2Amplitude} m</div>
              <div className="text-[10px] text-[#78716C]">Period: 12.4206 hrs (28.984°/h)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Principal Solar (S₂)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">{earth.s2Amplitude} m</div>
              <div className="text-[10px] text-[#78716C]">Period: 12.0000 hrs (30.000°/h)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Luni-Solar Diurnal (K₁)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{earth.k1Amplitude} m</div>
              <div className="text-[10px] text-[#78716C]">Period: 23.9345 hrs (15.041°/h)</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Total Tidal Range</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{earth.tidalRangeMeters} m</div>
              <div className="text-[10px] text-[#78716C]">Peak Spring-Neap Excursion</div>
            </div>
          </div>

          {/* 48-Hour Tidal Harmonic Synthesis Plot */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Waves className="w-4 h-4 text-[#0284C7]" />
                <span>48-Hour Multi-Harmonic Water Level Elevation $\eta(t)$</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Harmonic Sum: $\sum_k A_k \cos(\omega_k t + \phi_k)$</span>
            </div>

            <div className="h-44 w-full bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg p-2 relative flex items-center justify-center">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <line x1="0" y1="60" x2="500" y2="60" stroke="#DDD6C7" strokeDasharray="3 3" strokeWidth="1" />
                {/* Tidal Waveform */}
                <path
                  d={tidalCurve
                    .map((p, i) => {
                      const x = (p.t / 48) * 500;
                      const y = 60 - (p.height / (earth.tidalRangeMeters || 1)) * 48;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="2"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#78716C]">
              <span>t = 0.0 hrs (High Tide Spring)</span>
              <span>t = 24.0 hrs (Diurnal Inequity)</span>
              <span>t = 48.0 hrs (Spring Completion)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEISMIC STA/LTA */}
      {activeTab === 'seismic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">STA/LTA Peak Trigger</div>
              <div className="text-base font-bold text-[#DC2626] mt-1">{earth.staLtaTriggerRatio}x</div>
              <div className="text-[10px] text-[#78716C]">Detection Threshold &gt; 3.0</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">P-Wave Arrival (t_P)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">{earth.seismicPwaveArrivalSec} s</div>
              <div className="text-[10px] text-[#78716C]">Primary Compressional Front</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">S-Wave Arrival (t_S)</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">{earth.seismicSwaveArrivalSec} s</div>
              <div className="text-[10px] text-[#78716C]">Secondary Transverse Shear</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Wadati Ratio (Vp / Vs)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">1.732</div>
              <div className="text-[10px] text-[#78716C]">Poisson solid $(\nu = 0.25)$</div>
            </div>
          </div>

          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Activity className="w-4 h-4 text-[#DC2626]" />
                <span>Allen Recursive STA/LTA Seismic Energy Detector</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Short-Term Window: 200 ms | Long-Term Window: 2.0 s</span>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#57534E]">Trigger Threshold Status:</span>
                <span className={`font-bold ${earth.staLtaTriggerRatio > 3.0 ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>
                  {earth.staLtaTriggerRatio > 3.0 ? 'EARTHQUAKE ARRIVAL CONFIRMED' : 'QUIESCENT MICROSEISM'}
                </span>
              </div>
              <div className="w-full bg-[#E6DFC6] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#DC2626] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (earth.staLtaTriggerRatio / 10.0) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#78716C]">
                <span>Noise Floor (1.0)</span>
                <span>Trigger Level (3.0)</span>
                <span>Major Shock (10.0+)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GEOMAGNETIC STORMS */}
      {activeTab === 'geomagnetic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Ring Current (Dst Index)</div>
              <div className="text-base font-bold text-[#0F766E] mt-1">-42 nT</div>
              <div className="text-[10px] text-[#78716C]">Moderate Magnetospheric Depression</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Planetary Kp Index</div>
              <div className="text-base font-bold text-[#B45F1B] mt-1">3.67 Kp</div>
              <div className="text-[10px] text-[#78716C]">NOAA G1 Geomagnetic Scale</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Subsolar Standoff (Rmp)</div>
              <div className="text-base font-bold text-[#1F2430] mt-1">9.8 R_E</div>
              <div className="text-[10px] text-[#78716C]">Solar wind dynamic pressure balance</div>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
              <div className="text-[10px] text-[#78716C] uppercase font-bold">Auroral Electrojet (AE)</div>
              <div className="text-base font-bold text-[#0284C7] mt-1">315 nT</div>
              <div className="text-[10px] text-[#78716C]">High-latitude ionospheric current</div>
            </div>
          </div>
        </div>
      )}

      <ExportBar
        title="Earth & Tidal Systems"
        data={{
          tidalRangeMeters: earth.tidalRangeMeters,
          m2Amplitude: earth.m2Amplitude,
          s2Amplitude: earth.s2Amplitude,
          seismicPwaveArrivalSec: earth.seismicPwaveArrivalSec,
          staLtaTriggerRatio: earth.staLtaTriggerRatio,
        }}
      />
    </div>
  );
};
