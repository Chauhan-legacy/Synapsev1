import React, { useMemo } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { computeChaosMetrics } from '../services/advancedAnalyticsService';
import { Flame, Orbit } from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';

export const ChaosLabView: React.FC = () => {
  const { activeSignal } = useSignal();
  const primaryChannel = activeSignal.channelNames[0] || 'Channel 1';
  const values = activeSignal.channels[primaryChannel] || [];

  const chaos = useMemo(() => computeChaosMetrics(values), [values]);

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Nonlinear Dynamics &amp; Chaos Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B45F1B]/15 text-[#B45F1B] font-bold">
              Dimension 3 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Phase-space topology, Gottwald-Melbourne 0-1 test for deterministic chaos, Grassberger-Procaccia correlation dimension $D_2$, and Poincaré stroboscopic sections.
          </p>
        </div>
      </div>

      <CollapsibleExplainer title="How does the 0-1 Test distinguish deterministic chaos from periodic motion?">
        Unlike classical Lyapunov exponents, the Gottwald-Melbourne 0-1 test acts directly on the time series without delay embedding.
        It maps the signal onto 2D translation coordinates $(p, q)$. For periodic orbits, the motion is strictly bounded in a closed ring ($K \approx 0$).
        For deterministic chaos, the trajectory behaves as a 2D Brownian random walk ($K \approx 1$).
      </CollapsibleExplainer>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">0-1 Chaos Growth Rate (K)</div>
          <div className={`text-base font-bold mt-1 ${chaos.isChaotic ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>
            K = {chaos.growthRateK.toFixed(3)}
          </div>
          <div className="text-[10px] text-[#78716C]">
            {chaos.isChaotic ? 'DETERMINISTIC CHAOS' : 'REGULAR / PERIODIC'}
          </div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Correlation Dimension (D₂)</div>
          <div className="text-base font-bold text-[#1F2430] mt-1">{chaos.correlationDimensionD2}</div>
          <div className="text-[10px] text-[#78716C]">Grassberger-Procaccia fractal scaling</div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Attractor Topology</div>
          <div className="text-base font-bold text-[#B45F1B] mt-1">
            {chaos.correlationDimensionD2 > 2.0 ? 'Fractal Manifold' : 'Limit Cycle'}
          </div>
          <div className="text-[10px] text-[#78716C]">Phase space geometric class</div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Poincaré Slices</div>
          <div className="text-base font-bold text-[#1F2430] mt-1">{chaos.poincareMap.length} points</div>
          <div className="text-[10px] text-[#78716C]">Transversal section crossings</div>
        </div>
      </div>

      {/* 2-Column Visualizer Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {/* Visualizer 1: Gottwald-Melbourne (p, q) Translation Orbit */}
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Flame className="w-4 h-4 text-[#B45F1B]" />
              <span>Gottwald-Melbourne (p, q) Translation Plane</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chaos.isChaotic ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {chaos.isChaotic ? 'Diffusive Drift (Chaotic)' : 'Bounded Ring (Periodic)'}
            </span>
          </div>

          <div className="h-56 w-full bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg relative overflow-hidden flex items-center justify-center p-3">
            <svg className="w-full h-full" viewBox="-50 -50 100 100">
              <line x1="-50" y1="0" x2="50" y2="0" stroke="#DDD6C7" strokeDasharray="2 2" />
              <line x1="0" y1="-50" x2="0" y2="50" stroke="#DDD6C7" strokeDasharray="2 2" />
              {chaos.translationTrajectory.map((pt, i) => (
                <circle
                  key={i}
                  cx={(pt.p % 40) - 20}
                  cy={(pt.q % 40) - 20}
                  r={2.5}
                  fill={chaos.isChaotic ? '#DC2626' : '#0F766E'}
                  fillOpacity={0.7}
                />
              ))}
            </svg>
          </div>
          <div className="text-[10px] text-[#78716C]">
            Asymptotic growth rate K = cov(log n, log M(n)) / var(log n). Bounded loops = periodic (K &rarr; 0); 2D random walk diffusion = chaos (K &rarr; 1).
          </div>
        </div>

        {/* Visualizer 2: Poincaré Stroboscopic Return Map */}
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Orbit className="w-4 h-4 text-[#0F766E]" />
              <span>Poincaré Stroboscopic Return Map: x(t) vs x(t+τ)</span>
            </div>
            <span className="text-[10px] text-[#78716C]">Hyperplane z ≈ 0</span>
          </div>

          <div className="h-56 w-full bg-[#F8F6F1] border border-[#DDD6C7] rounded-lg relative overflow-hidden flex items-center justify-center p-3">
            <svg className="w-full h-full" viewBox="-3 -3 6 6">
              <line x1="-3" y1="0" x2="3" y2="0" stroke="#DDD6C7" strokeDasharray="2 2" />
              <line x1="0" y1="-3" x2="0" y2="3" stroke="#DDD6C7" strokeDasharray="2 2" />
              {chaos.poincareMap.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={0.12}
                  fill="#0F766E"
                  fillOpacity={0.8}
                />
              ))}
            </svg>
          </div>
          <div className="text-[10px] text-[#78716C]">
            Continuous differential flows intersect the section plane as discrete points. Smooth curves indicate quasi-periodicity; Cantor set dust indicates a strange attractor.
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl shadow-xs font-mono text-xs text-center">
        <MathFormula
          formula="p(n) = \sum_{j=1}^n x(j)\cos(j c), \quad q(n) = \sum_{j=1}^n x(j)\sin(j c), \quad M(n) = \lim_{N \to \infty}\frac{1}{N}\sum_{j=1}^N \left(p(j+n) - p(j)\right)^2 + \left(q(j+n) - q(j)\right)^2"
          displayMode={true}
        />
        <div className="text-[10px] text-[#78716C] mt-1 font-mono">Gottwald-Melbourne Translation Coordinates &amp; Mean Square Displacement Growth M(n)</div>
      </div>

      <ExportBar title="Chaos & Dynamics Lab" data={{ growthRateK: chaos.growthRateK, correlationDimD2: chaos.correlationDimensionD2 }} />
    </div>
  );
};

export default ChaosLabView;
