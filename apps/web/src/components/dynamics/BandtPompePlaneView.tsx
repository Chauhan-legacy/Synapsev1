import React, { useState } from 'react';
import {
  computeBandtPompeComplexity,
  BandtPompeResult,
} from '../../utils/advancedMathEngines';
import { MathFormula } from '../common/MathFormula';

interface BandtPompePlaneViewProps {
  signal: number[];
  delay?: number;
}

export const BandtPompePlaneView: React.FC<BandtPompePlaneViewProps> = ({
  signal,
  delay = 1,
}) => {
  const [orderD, setOrderD] = useState<number>(4); // Permutation order D = 3, 4, 5
  const bpResult: BandtPompeResult = computeBandtPompeComplexity(signal, orderD, delay);

  // Convert (H, C) coordinates to SVG space [10%..90%, 90%..10%]
  // H in [0, 1], C in [0, 0.45]
  const cMaxDomain = 0.45;
  const toSvgX = (h: number) => 10 + Math.max(0, Math.min(1, h)) * 80;
  const toSvgY = (c: number) => 90 - (Math.max(0, Math.min(cMaxDomain, c)) / cMaxDomain) * 80;

  const activeX = toSvgX(bpResult.permutationEntropyH);
  const activeY = toSvgY(bpResult.statisticalComplexityC);

  // Regime Color
  const getRegimeBadge = (regime: string) => {
    switch (regime) {
      case 'Deterministic Chaos':
        return 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30';
      case 'Gaussian White Noise':
        return 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]/30';
      case 'Fractional Noise':
        return 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]/30';
      default:
        return 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]/30';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Statistical Physics &amp; Chaos
            </span>
            <h3 className="text-sm font-bold text-[#1F2430]">
              The Bandt–Pompe Statistical Complexity Plane (H × C)
            </h3>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Shannon permutation entropy H vs Jensen–Shannon statistical complexity C_JS (Lamberti et al., 2004) distinguishing chaos, noise, and order.
          </p>
        </div>

        {/* Permutation Order Selector */}
        <div className="flex items-center gap-1.5 rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-xs font-mono">
          <span className="px-2 text-[#6B6F7B]">Pattern Order D:</span>
          {[3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setOrderD(d)}
              className={`px-2.5 py-0.5 rounded font-bold transition-colors ${
                orderD === d ? 'bg-[#0F766E] text-white' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
            >
              D = {d} ({d}! = {d === 3 ? 6 : d === 4 ? 24 : 120})
            </button>
          ))}
        </div>
      </div>

      {/* KaTeX Math Definition */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="text-[#1F2430] overflow-x-auto">
          <MathFormula
            formula="C_{JS}[P] = Q_0 \cdot D_{JS}[P, P_e] \cdot H_s[P], \quad H_s[P] = -\frac{1}{\ln(D!)}\sum_{\pi} p_\pi \ln p_\pi"
            displayMode={false}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${getRegimeBadge(bpResult.regime)}`}>
            Regime: {bpResult.regime}
          </span>
        </div>
      </div>

      {/* Numerical Coordinate Readout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Normalized Entropy (H)</div>
          <div className="text-xl font-bold text-[#0F766E]">{bpResult.permutationEntropyH.toFixed(3)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Shannon H ∈ [0, 1]</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Statistical Complexity (C)</div>
          <div className="text-xl font-bold text-[#4338CA]">{bpResult.statisticalComplexityC.toFixed(3)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Jensen-Shannon C_JS</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Ordinal Dimension (D!)</div>
          <div className="text-xl font-bold text-[#1F2430]">{orderD === 3 ? 6 : orderD === 4 ? 24 : 120}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Permutation bins</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Embedding Delay (τ)</div>
          <div className="text-xl font-bold text-[#D97706]">{delay}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Sample lag step</div>
        </div>
      </div>

      {/* Main 2D Complexity Plane Visualizer */}
      <div className="space-y-2">
        <div className="h-80 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex items-center justify-center relative overflow-hidden shadow-2xs">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Axis Bounding Lines */}
            <line x1="10" y1="90" x2="90" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
            <line x1="10" y1="10" x2="10" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />

            {/* Grid ticks */}
            {[0.2, 0.4, 0.6, 0.8].map((h) => (
              <line
                key={h}
                x1={toSvgX(h)}
                y1="10"
                x2={toSvgX(h)}
                y2="90"
                stroke="#DDD6C7"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
              />
            ))}
            {[0.1, 0.2, 0.3, 0.4].map((c) => (
              <line
                key={c}
                x1="10"
                y1={toSvgY(c)}
                x2="90"
                y2={toSvgY(c)}
                stroke="#DDD6C7"
                strokeWidth="0.4"
                strokeDasharray="1.5 1.5"
              />
            ))}

            {/* Theoretical Allowable Corridor (Shaded between C_min and C_max) */}
            {(() => {
              const { entropyValues, cMin, cMax } = bpResult.theoreticalCurves;
              let pathStr = `M ${toSvgX(entropyValues[0])} ${toSvgY(cMin[0])}`;
              for (let i = 0; i < entropyValues.length; i++) {
                pathStr += ` L ${toSvgX(entropyValues[i])} ${toSvgY(cMin[i])}`;
              }
              for (let i = entropyValues.length - 1; i >= 0; i--) {
                pathStr += ` L ${toSvgX(entropyValues[i])} ${toSvgY(cMax[i])}`;
              }
              pathStr += ' Z';
              return (
                <path
                  d={pathStr}
                  fill="rgba(15, 118, 110, 0.06)"
                  stroke="none"
                />
              );
            })()}

            {/* C_max Upper Boundary Curve */}
            <polyline
              fill="none"
              stroke="#0F766E"
              strokeWidth="1.2"
              strokeDasharray="2 1"
              points={bpResult.theoreticalCurves.entropyValues
                .map((h, i) => `${toSvgX(h).toFixed(1)},${toSvgY(bpResult.theoreticalCurves.cMax[i]).toFixed(1)}`)
                .join(' ')}
            />

            {/* C_min Lower Boundary Curve */}
            <polyline
              fill="none"
              stroke="#0F766E"
              strokeWidth="0.8"
              strokeDasharray="2 1"
              points={bpResult.theoreticalCurves.entropyValues
                .map((h, i) => `${toSvgX(h).toFixed(1)},${toSvgY(bpResult.theoreticalCurves.cMin[i]).toFixed(1)}`)
                .join(' ')}
            />

            {/* Physical Regime Zones Shading / Labels */}
            {/* Deterministic Chaos Zone */}
            <rect
              x={toSvgX(0.4)}
              y={toSvgY(0.42)}
              width={toSvgX(0.78) - toSvgX(0.4)}
              height={toSvgY(0.22) - toSvgY(0.42)}
              fill="rgba(245, 158, 11, 0.08)"
              rx="2"
            />

            {/* Benchmark Attractor Landmarks */}
            {bpResult.benchmarkLandmarks.map((lm, idx) => {
              const lx = toSvgX(lm.h);
              const ly = toSvgY(lm.c);
              return (
                <g key={idx} opacity={0.65}>
                  <circle cx={lx} cy={ly} r="2.2" fill="#6B6F7B" />
                  <text
                    x={lx + 3}
                    y={ly - 2}
                    fill="#6B6F7B"
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {lm.name}
                  </text>
                </g>
              );
            })}

            {/* Active Signal Marker with Crosshair & Confidence Glow */}
            <circle
              cx={activeX}
              cy={activeY}
              r="6.5"
              fill="rgba(15, 118, 110, 0.25)"
              className="animate-pulse"
            />
            <circle
              cx={activeX}
              cy={activeY}
              r="3.5"
              fill="#0F766E"
              stroke="#FFFFFF"
              strokeWidth="1.2"
            />
            <line
              x1={activeX - 8}
              y1={activeY}
              x2={activeX + 8}
              y2={activeY}
              stroke="#0F766E"
              strokeWidth="0.8"
            />
            <line
              x1={activeX}
              y1={activeY - 8}
              x2={activeX}
              y2={activeY + 8}
              stroke="#0F766E"
              strokeWidth="0.8"
            />
          </svg>

          {/* Dynamic Coordinate Badge on Hover */}
          <div className="absolute top-3 left-4 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2 py-1 text-[10px] font-mono shadow-2xs space-y-0.5">
            <div className="font-bold text-[#0F766E]">Active Signal: H = {bpResult.permutationEntropyH}, C = {bpResult.statisticalComplexityC}</div>
            <div className="text-[#6B6F7B]">Theoretical Bounds: C_max = 0.42 • C_min = 0.00</div>
          </div>

          {/* Bounding Labels */}
          <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#6B6F7B]">
            Shannon Permutation Entropy H ∈ [0, 1] &rarr;
          </div>
          <div className="absolute top-2 left-4 text-[10px] font-mono text-[#6B6F7B]">
            &uarr; Statistical Complexity C_JS ∈ [0, 0.45]
          </div>
          <div className="absolute bottom-10 right-4 text-[9px] font-mono text-[#991B1B] bg-[#FEE2E2]/90 px-1 rounded border border-[#EF4444]/30">
            Gaussian White Noise (H≈1, C≈0)
          </div>
          <div className="absolute top-8 left-40 text-[9px] font-mono text-[#92400E] bg-[#FEF3C7]/90 px-1 rounded border border-[#F59E0B]/30">
            Deterministic Chaos Corridor
          </div>
        </div>

        {/* Diagnostic Explainer Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-[#6B6F7B] px-1 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-[#0F766E]" />
              <span className="text-[#1F2430]">Allowable Physical Space [C_min, C_max]</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]" />
              <span className="text-[#1F2430] font-bold">Active Signal Position</span>
            </span>
          </div>
          <span>Noise has H → 1, C → 0; Chaos exhibits peak complexity C &gt; 0.25</span>
        </div>
      </div>
    </div>
  );
};
