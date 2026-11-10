import React, { useState } from 'react';
import {
  computeMfDfaSpectrum,
  MfDfaResult,
} from '../../utils/advancedMathEngines';
import { MathFormula } from '../common/MathFormula';

interface MultifractalDfaViewProps {
  signal: number[];
}

export const MultifractalDfaView: React.FC<MultifractalDfaViewProps> = ({ signal }) => {
  const [activeTab, setActiveTab] = useState<'singularity' | 'hurst'>('singularity');
  const mfResult: MfDfaResult = computeMfDfaSpectrum(signal);

  // Singularity domain bounds
  const alphaMin = Math.min(...mfResult.alpha, 0.1);
  const alphaMax = Math.max(...mfResult.alpha, 1.4);
  const alphaRange = alphaMax - alphaMin || 1.0;

  // Convert (alpha, fAlpha) to SVG space
  const toSvgX = (a: number) => 12 + ((a - alphaMin) / alphaRange) * 76;
  const toSvgY = (f: number) => 90 - (Math.max(0, Math.min(1.2, f)) / 1.2) * 80;

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Fractal Dynamics &amp; Turbulence
            </span>
            <h3 className="text-sm font-bold text-[#1F2430]">
              Multifractal Singularity Spectrum f(α) vs α (MF-DFA)
            </h3>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Generalized Hurst scaling moments over orders q ∈ [-5, +5] Legendre-transformed into the Singularity Spectrum.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('singularity')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'singularity' ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            Singularity Spectrum f(α)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hurst')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'hurst' ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
            }`}
          >
            Generalized Hurst h(q)
          </button>
        </div>
      </div>

      {/* KaTeX Math Formula Banner */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="text-[#1F2430] overflow-x-auto">
          <MathFormula
            formula="\alpha = \frac{d\tau(q)}{dq}, \quad f(\alpha) = q\alpha - \tau(q), \quad \Delta \alpha = \alpha_{\max} - \alpha_{\min}"
            displayMode={false}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
              mfResult.isMultifractal
                ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]/30'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30'
            }`}
          >
            {mfResult.isMultifractal ? 'Multifractal Signature Confirmed' : 'Monofractal Process'}
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Spectral Width (Δα)</div>
          <div className="text-xl font-bold text-[#0F766E]">{mfResult.spectralWidthDeltaAlpha.toFixed(3)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Complexity richness</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Asymmetry Index (A)</div>
          <div className="text-xl font-bold text-[#4338CA]">{mfResult.asymmetryIndex.toFixed(2)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">
            {mfResult.asymmetryIndex > 1.0 ? 'Small Fluctuations' : 'Large Outliers'}
          </div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Classical Hurst h(2)</div>
          <div className="text-xl font-bold text-[#1F2430]">
            {(mfResult.hurstQ[mfResult.ordersQ.indexOf(2)] || 0.65).toFixed(3)}
          </div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Standard monofractal</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Max Dimension f(α)</div>
          <div className="text-xl font-bold text-[#D97706]">
            {Math.max(...mfResult.fAlpha).toFixed(3)}
          </div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">Peak Hausdorff dim</div>
        </div>
      </div>

      {/* Main Graph */}
      {activeTab === 'singularity' && (
        <div className="space-y-2">
          <div className="h-80 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex items-center justify-center relative overflow-hidden shadow-2xs">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Graticule Grid */}
              <line x1="10" y1="90" x2="95" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
              <line x1="10" y1="10" x2="10" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />

              {[0.2, 0.4, 0.6, 0.8, 1.0].map((fVal) => (
                <line
                  key={fVal}
                  x1="10"
                  y1={toSvgY(fVal)}
                  x2="95"
                  y2={toSvgY(fVal)}
                  stroke="#DDD6C7"
                  strokeWidth="0.4"
                  strokeDasharray="1.5 1.5"
                />
              ))}

              {/* Inverted Parabola Smooth Curve */}
              <path
                d={mfResult.alpha
                  .map((a, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(a).toFixed(1)} ${toSvgY(mfResult.fAlpha[i]).toFixed(1)}`)
                  .join(' ')}
                fill="none"
                stroke="#0F766E"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Shaded Area Under Singularity Parabola */}
              <path
                d={`M ${toSvgX(mfResult.alpha[0])} 90 ${mfResult.alpha
                  .map((a, i) => `L ${toSvgX(a).toFixed(1)} ${toSvgY(mfResult.fAlpha[i]).toFixed(1)}`)
                  .join(' ')} L ${toSvgX(mfResult.alpha[mfResult.alpha.length - 1])} 90 Z`}
                fill="rgba(15, 118, 110, 0.08)"
              />

              {/* Monofractal Benchmark Reference (Vertical Spike at h(2)) */}
              {(() => {
                const h2 = mfResult.hurstQ[mfResult.ordersQ.indexOf(2)] || 0.65;
                const h2X = toSvgX(h2);
                return (
                  <g>
                    <line
                      x1={h2X}
                      y1="10"
                      x2={h2X}
                      y2="90"
                      stroke="#C0392B"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={h2X + 2}
                      y="20"
                      fill="#C0392B"
                      fontSize="6"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Monofractal α = h(2)
                    </text>
                  </g>
                );
              })()}

              {/* Scatter Points along the Singularity Spectrum */}
              {mfResult.alpha.map((a, i) => {
                const cx = toSvgX(a);
                const cy = toSvgY(mfResult.fAlpha[i]);
                const qVal = mfResult.ordersQ[i];

                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r="2.8" fill="#0F766E" stroke="#FFFFFF" strokeWidth="0.8" />
                    <text
                      x={cx}
                      y={cy - 4}
                      fill="#1F2430"
                      fontSize="5"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      q={qVal}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#6B6F7B]">
              Singularity Strength α (Local Hölder Exponent) &rarr;
            </div>
            <div className="absolute top-2 left-4 text-[10px] font-mono text-[#6B6F7B]">
              &uarr; Multifractal Dimension f(α)
            </div>
            <div className="absolute top-2 right-4 text-[10px] font-mono text-[#0F766E] bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]">
              Spectral Width Δα = {mfResult.spectralWidthDeltaAlpha}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hurst' && (
        <div className="space-y-2">
          <div className="h-80 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex items-center justify-center relative overflow-hidden shadow-2xs">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1="10" y1="90" x2="95" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />
              <line x1="10" y1="10" x2="10" y2="90" stroke="#DDD6C7" strokeWidth="0.8" />

              {/* Hurst Curve h(q) */}
              <polyline
                fill="none"
                stroke="#4338CA"
                strokeWidth="2.0"
                points={mfResult.ordersQ
                  .map((q, idx) => {
                    const x = 12 + ((q + 5) / 10) * 80;
                    const y = 90 - (mfResult.hurstQ[idx] / 1.5) * 80;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />

              {mfResult.ordersQ.map((q, idx) => {
                const cx = 12 + ((q + 5) / 10) * 80;
                const cy = 90 - (mfResult.hurstQ[idx] / 1.5) * 80;
                return (
                  <circle
                    key={idx}
                    cx={cx}
                    cy={cy}
                    r="2.5"
                    fill="#4338CA"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                  />
                );
              })}
            </svg>

            <div className="absolute bottom-2 right-4 text-[10px] font-mono text-[#6B6F7B]">
              Moment Order q ∈ [-5, +5] &rarr;
            </div>
            <div className="absolute top-2 left-4 text-[10px] font-mono text-[#6B6F7B]">
              &uarr; Generalized Hurst Exponent h(q)
            </div>
            <div className="absolute top-2 right-4 text-[10px] font-mono text-[#4338CA] bg-[#FFFFFF]/90 px-1.5 py-0.5 rounded border border-[#DDD6C7]">
              h(q) decreases with q indicates multiscale multifractality
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
