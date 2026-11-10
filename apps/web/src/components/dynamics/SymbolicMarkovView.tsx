import React, { useState } from 'react';
import {
  computeSymbolicMarkovDynamics,
  SymbolicDynamicsResult,
} from '../../utils/advancedMathEngines';
import { MathFormula } from '../common/MathFormula';

interface SymbolicMarkovViewProps {
  signal: number[];
}

export const SymbolicMarkovView: React.FC<SymbolicMarkovViewProps> = ({ signal }) => {
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const markov: SymbolicDynamicsResult = computeSymbolicMarkovDynamics(signal);

  // 4 Node Coordinates in SVG [0..100, 0..100] arranged in diamond/square layout
  const nodePositions = [
    { x: 25, y: 75, id: 0, label: 's₁', name: 'Extreme Low', color: '#0F766E' },
    { x: 25, y: 25, id: 1, label: 's₂', name: 'Sub-Mean', color: '#0284C7' },
    { x: 75, y: 25, id: 2, label: 's₃', name: 'Supra-Mean', color: '#D97706' },
    { x: 75, y: 75, id: 3, label: 's₄', name: 'Extreme High', color: '#DC2626' },
  ];

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Information Theory &amp; Automata
            </span>
            <h3 className="text-sm font-bold text-[#1F2430]">
              Symbolic Dynamics &amp; Markov State Transition Graph
            </h3>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Alphabet partition Σ = {'{s₁, s₂, s₃, s₄}'} computing directed Markov transition probabilities and Shannon–Khinchin entropy rate.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-[#EFEBE0] border border-[#DDD6C7] text-[#1F2430] font-bold">
            Alphabet Size |Σ| = 4
          </span>
        </div>
      </div>

      {/* KaTeX Formula Banner */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="text-[#1F2430] overflow-x-auto">
          <MathFormula
            formula="h_\mu = -\sum_{i=1}^4 \mu_i \sum_{j=1}^4 P_{ij} \log_2 P_{ij}, \quad \mathbf{\mu} \mathbf{P} = \mathbf{\mu}, \quad K(x) \approx N \cdot h_\mu"
            displayMode={false}
          />
        </div>
        <div className="text-[11px] font-mono text-[#0F766E] font-semibold shrink-0">
          Entropy Rate h_μ = {markov.shannonKhinchinEntropyRate} bits/symbol
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Shannon-Khinchin Rate</div>
          <div className="text-xl font-bold text-[#0F766E]">{markov.shannonKhinchinEntropyRate.toFixed(3)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">bits per symbol</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Kolmogorov Bound</div>
          <div className="text-xl font-bold text-[#4338CA]">{markov.algorithmicComplexityBound} B</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Compressible bound</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Max Theoretical Rate</div>
          <div className="text-xl font-bold text-[#1F2430]">2.000</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">log₂(4) for IID uniform</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Selected State</div>
          <div className="text-xl font-bold text-[#D97706]">
            {selectedState !== null ? `s${selectedState + 1}` : 'All'}
          </div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Click node to isolate</div>
        </div>
      </div>

      {/* Main Dual Grid: Directed Automaton Graph + 4x4 Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Directed Finite State Automaton Graph */}
        <div className="h-80 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-3 flex flex-col justify-between relative shadow-2xs">
          <div className="text-[10px] font-mono text-[#6B6F7B] flex justify-between">
            <span>DIRECTED FINITE STATE AUTOMATON</span>
            <span>Edge weights = P(s_j | s_i)</span>
          </div>

          <svg className="w-full h-64" viewBox="0 0 100 100">
            {/* Draw Directed Transition Arcs */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6B6F7B" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#0F766E" />
              </marker>
            </defs>

            {markov.transitions.map((t, idx) => {
              if (t.probability < 0.05) return null;
              const pFrom = nodePositions[t.from];
              const pTo = nodePositions[t.to];

              const isHighlighted = selectedState === null || selectedState === t.from;
              const strokeColor = isHighlighted ? '#0F766E' : '#E2E8F0';
              const markerType = isHighlighted ? 'url(#arrow-active)' : 'url(#arrow)';
              const strokeW = Math.max(0.6, t.probability * 2.8);

              // Self-loop
              if (t.from === t.to) {
                const loopX = pFrom.x + (pFrom.x < 50 ? -8 : 8);
                const loopY = pFrom.y + (pFrom.y < 50 ? -8 : 8);
                return (
                  <circle
                    key={idx}
                    cx={loopX}
                    cy={loopY}
                    r="4.5"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    opacity={isHighlighted ? 0.85 : 0.25}
                  />
                );
              }

              // Inter-node bezier curve
              const midX = (pFrom.x + pTo.x) / 2 + (pFrom.y - pTo.y) * 0.12;
              const midY = (pFrom.y + pTo.y) / 2 + (pTo.x - pFrom.x) * 0.12;

              return (
                <g key={idx} opacity={isHighlighted ? 0.9 : 0.2}>
                  <path
                    d={`M ${pFrom.x} ${pFrom.y} Q ${midX} ${midY} ${pTo.x} ${pTo.y}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    markerEnd={markerType}
                  />
                  {t.probability > 0.18 && isHighlighted && (
                    <text
                      x={midX}
                      y={midY}
                      fill="#1F2430"
                      fontSize="4.5"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      className="bg-white"
                    >
                      {t.probability.toFixed(2)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw State Nodes */}
            {nodePositions.map((n) => {
              const state = markov.states[n.id];
              const isSelected = selectedState === n.id;

              return (
                <g
                  key={n.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedState(isSelected ? null : n.id)}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={isSelected ? 10 : 8.5}
                    fill="#FFFFFF"
                    stroke={n.color}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                  />
                  <text
                    x={n.x}
                    y={n.y - 0.5}
                    fill={n.color}
                    fontSize="6"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 12}
                    fill="#6B6F7B"
                    fontSize="4"
                    fontFamily="JetBrains Mono, monospace"
                    textAnchor="middle"
                  >
                    μ = {(state.stationaryProb * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="text-[10px] font-mono text-[#6B6F7B] text-center">
            Click any state node to highlight outgoing conditional transitions
          </div>
        </div>

        {/* Right: 4x4 Transition Probability Matrix Heatmap */}
        <div className="h-80 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-3 flex flex-col justify-between shadow-2xs font-mono">
          <div className="text-[10px] text-[#6B6F7B] flex justify-between border-b border-[#DDD6C7] pb-1">
            <span>MARKOV TRANSITION PROBABILITY MATRIX P_{'{ij}'}</span>
            <span>Row = From (s_i), Col = To (s_j)</span>
          </div>

          <div className="overflow-x-auto py-2">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="border-b border-[#DDD6C7] text-[#6B6F7B] text-[10px]">
                  <th className="p-1.5 text-left">s_i \ s_j</th>
                  <th className="p-1.5">s₁</th>
                  <th className="p-1.5">s₂</th>
                  <th className="p-1.5">s₃</th>
                  <th className="p-1.5">s₄</th>
                  <th className="p-1.5 text-right font-bold text-[#0F766E]">Stationary μ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD6C7]/50">
                {markov.transitionMatrix.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-colors ${
                      selectedState === i ? 'bg-[#0F766E]/10' : 'hover:bg-[#F6F3EC]'
                    }`}
                  >
                    <td className="p-2 text-left font-bold text-[#1F2430]">s{i + 1}</td>
                    {row.map((val, j) => {
                      const bgOpacity = Math.min(0.8, val);
                      return (
                        <td key={j} className="p-2">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold"
                            style={{
                              backgroundColor: `rgba(15, 118, 110, ${bgOpacity * 0.45})`,
                              color: val > 0.4 ? '#0F766E' : '#1F2430',
                            }}
                          >
                            {val.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-bold text-[#0F766E]">
                      {(markov.states[i].stationaryProb * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample Symbolic Trajectory Stream */}
          <div className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-[10px] space-y-1">
            <span className="text-[#6B6F7B] font-bold uppercase">Symbolic Trajectory Trace (First 36 samples):</span>
            <div className="text-[#0F766E] tracking-widest break-all font-semibold">
              {markov.symbolSequenceSample}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
