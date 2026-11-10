import React, { useState } from 'react';
import {
  computeTdaPersistentHomology,
  Point3D,
} from '../../utils/advancedMathEngines';
import { MathFormula } from '../common/MathFormula';

interface TdaHomologyViewProps {
  points3D: Point3D[];
}

export const TdaHomologyView: React.FC<TdaHomologyViewProps> = ({ points3D }) => {
  const [subView, setSubView] = useState<'diagram' | 'barcode' | 'betti'>('diagram');
  const [filtrationEps, setFiltrationEps] = useState<number>(0.85);

  const tda = computeTdaPersistentHomology(points3D, 75);
  const maxRadius = tda.features.reduce((m, f) => Math.max(m, f.death), 1.0);

  // Active Betti numbers at filtrationEps
  const activeBetti0 = tda.features.filter(
    (f) => f.dimension === 0 && f.birth <= filtrationEps && f.death > filtrationEps
  ).length;
  const activeBetti1 = tda.features.filter(
    (f) => f.dimension === 1 && f.birth <= filtrationEps && f.death > filtrationEps
  ).length;

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Topology &amp; Simplicial Complexes
            </span>
            <h3 className="text-sm font-bold text-[#1F2430]">
              Topological Data Analysis (TDA) &amp; Persistent Homology
            </h3>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Vietoris–Rips simplicial filtration over scale radius ε tracking H₀ (connected components) and H₁ (1D cycles).
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setSubView('diagram')}
            className={`px-3 py-1 rounded transition-colors ${subView === 'diagram' ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
          >
            Persistence Diagram (b, d)
          </button>
          <button
            type="button"
            onClick={() => setSubView('barcode')}
            className={`px-3 py-1 rounded transition-colors ${subView === 'barcode' ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
          >
            Lifespan Barcode
          </button>
          <button
            type="button"
            onClick={() => setSubView('betti')}
            className={`px-3 py-1 rounded transition-colors ${subView === 'betti' ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
          >
            Betti Curves β(ε)
          </button>
        </div>
      </div>

      {/* KaTeX Math Definition Banner */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="text-[#1F2430] overflow-x-auto">
          <MathFormula
            formula="\mathrm{VR}_\epsilon(X) = \{\sigma \subseteq X \mid \forall u, v \in \sigma, \|u - v\| \le \epsilon\}, \quad \beta_k = \mathrm{rank}(H_k)"
            displayMode={false}
          />
        </div>
        <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
          Persistent Entropy: {tda.persistentEntropy} bits • Max H₁ Lifetime: {tda.maxLifespanH1}
        </div>
      </div>

      {/* Interactive Metric Pill Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] font-mono uppercase text-[#6B6F7B]">Betti β₀ (Components)</div>
          <div className="text-lg font-bold font-mono text-[#0F766E]">{activeBetti0}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">at ε = {filtrationEps.toFixed(2)}</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] font-mono uppercase text-[#6B6F7B]">Betti β₁ (1D Cycles)</div>
          <div className="text-lg font-bold font-mono text-[#D97706]">{activeBetti1}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">at ε = {filtrationEps.toFixed(2)}</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] font-mono uppercase text-[#6B6F7B]">Persistent H₁ Loops</div>
          <div className="text-lg font-bold font-mono text-[#4338CA]">{tda.numCycles}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Orbital limit cycles</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] font-mono uppercase text-[#6B6F7B]">Filtration Radius (ε)</div>
          <div className="text-lg font-bold font-mono text-[#1F2430]">{filtrationEps.toFixed(2)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Simplex scale threshold</div>
        </div>
      </div>

      {/* Main Visual Display */}
      {subView === 'diagram' && (
        <div className="space-y-2">
          <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex items-center justify-center relative overflow-hidden shadow-2xs">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="10" y1="90" x2="90" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
              <line x1="10" y1="10" x2="10" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
              {[25, 45, 65, 85].map((g) => (
                <React.Fragment key={g}>
                  <line x1="10" y1={g} x2="90" y2={g} stroke="#DDD6C7" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
                  <line x1={g} y1="10" x2={g} y2="90" stroke="#DDD6C7" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
                </React.Fragment>
              ))}

              {/* Diagonal d = b (Points on diagonal are topological noise) */}
              <line x1="10" y1="90" x2="90" y2="10" stroke="#C0392B" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* Active filtration radius threshold box */}
              {(() => {
                const normEps = 10 + (filtrationEps / (maxRadius || 1)) * 80;
                return (
                  <line
                    x1={normEps}
                    y1="10"
                    x2={normEps}
                    y2="90"
                    stroke="#0F766E"
                    strokeWidth="0.9"
                    strokeDasharray="1 1"
                  />
                );
              })()}

              {/* Plot Persistence Features */}
              {tda.features.map((feat) => {
                const cx = 10 + (feat.birth / (maxRadius || 1)) * 80;
                const cy = 90 - (feat.death / (maxRadius || 1)) * 80;
                const color = feat.dimension === 0 ? '#0F766E' : '#D97706';
                const isSignificant = feat.lifetime > maxRadius * 0.25;

                return (
                  <g key={feat.id} className="cursor-pointer group">
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSignificant ? 2.6 : 1.8}
                      fill={color}
                      opacity={0.88}
                      stroke="#FFFFFF"
                      strokeWidth="0.5"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Labels and Axis Text */}
            <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#6B6F7B]">
              Birth Radius b (Simplex Creation) &rarr;
            </div>
            <div className="absolute top-2 left-4 text-[10px] font-mono text-[#6B6F7B]">
              &uarr; Death Radius d (Simplex Merging)
            </div>
            <div className="absolute top-2 right-4 text-[10px] font-mono text-[#C0392B] bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]">
              Diagonal d = b (Topological Noise Baseline)
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-[#6B6F7B] px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
                <span className="text-[#1F2430]">H₀ Connected Components</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                <span className="text-[#1F2430]">H₁ 1D Periodic Cycles</span>
              </span>
            </div>
            <span>Features far from diagonal indicate invariant attractor geometry</span>
          </div>
        </div>
      )}

      {subView === 'barcode' && (
        <div className="space-y-2">
          <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex flex-col justify-between overflow-y-auto shadow-2xs font-mono text-xs">
            <div className="text-[10px] text-[#6B6F7B] pb-1 border-b border-[#DDD6C7] flex justify-between">
              <span>HOMOLOGY INTERVAL [BIRTH, DEATH]</span>
              <span>LIFESPAN DURATION</span>
            </div>
            <div className="space-y-1.5 py-2">
              {tda.features.slice(0, 18).map((f) => {
                const birthPct = (f.birth / (maxRadius || 1)) * 100;
                const widthPct = Math.max(3, (f.lifetime / (maxRadius || 1)) * 100);
                const color = f.dimension === 0 ? 'bg-[#0F766E]' : 'bg-[#D97706]';

                return (
                  <div key={f.id} className="flex items-center gap-3 text-[11px]">
                    <span className="w-12 text-[#6B6F7B] font-semibold">
                      {f.dimension === 0 ? 'H₀' : 'H₁'}-{f.id}
                    </span>
                    <div className="flex-1 h-3.5 bg-[#F6F3EC] rounded-sm relative overflow-hidden border border-[#DDD6C7]/50">
                      <div
                        className={`absolute top-0 bottom-0 rounded-xs ${color}`}
                        style={{ left: `${birthPct}%`, width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="w-14 text-right text-[#1F2430] font-bold">
                      {f.lifetime.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {subView === 'betti' && (
        <div className="space-y-2">
          <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 relative shadow-2xs">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="10" y1="90" x2="95" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
              <line x1="10" y1="10" x2="10" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />

              {/* Betti 0 Curve (Teal) */}
              <polyline
                fill="none"
                stroke="#0F766E"
                strokeWidth="1.8"
                points={tda.betti0
                  .map((pt, idx) => {
                    const x = 10 + (idx / tda.betti0.length) * 85;
                    const y = 90 - (pt.betti / 24) * 75;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />

              {/* Betti 1 Curve (Amber) */}
              <polyline
                fill="none"
                stroke="#D97706"
                strokeWidth="1.8"
                points={tda.betti1
                  .map((pt, idx) => {
                    const x = 10 + (idx / tda.betti1.length) * 85;
                    const y = 90 - (pt.betti / 16) * 75;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />
            </svg>
            <div className="absolute top-3 right-4 flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-[#0F766E] font-bold">
                <span className="w-2.5 h-1 bg-[#0F766E]" /> β₀(ε) Components
              </span>
              <span className="flex items-center gap-1.5 text-[#D97706] font-bold">
                <span className="w-2.5 h-1 bg-[#D97706]" /> β₁(ε) 1D Cycles
              </span>
            </div>
            <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#6B6F7B]">
              Filtration Radius ε &rarr;
            </div>
          </div>
        </div>
      )}

      {/* Filtration Radius Interactive Slider */}
      <div className="flex items-center justify-between p-2.5 rounded bg-[#F6F3EC] border border-[#DDD6C7] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#1F2430]">Filtration Radius Filter (ε):</span>
          <span className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#DDD6C7] font-bold text-[#0F766E]">
            {filtrationEps.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#6B6F7B]">0.0</span>
          <input
            type="range"
            min="0.05"
            max={Math.max(1.0, maxRadius).toFixed(2)}
            step="0.05"
            value={filtrationEps}
            onChange={(e) => setFiltrationEps(Number(e.target.value))}
            className="w-40 sm:w-56 cursor-pointer accent-[#0F766E]"
          />
          <span className="text-[10px] text-[#6B6F7B]">{maxRadius.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
};
