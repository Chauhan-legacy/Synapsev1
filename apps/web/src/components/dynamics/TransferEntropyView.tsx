import React, { useState } from 'react';
import {
  computeNonlinearTransferEntropy,
  TransferEntropyResult,
} from '../../utils/advancedMathEngines';
import { MathFormula } from '../common/MathFormula';
import { ArrowRight, ArrowLeft } from 'lucide-react';

interface TransferEntropyViewProps {
  channel1: number[];
  channel2: number[];
  ch1Name?: string;
  ch2Name?: string;
}

export const TransferEntropyView: React.FC<TransferEntropyViewProps> = ({
  channel1,
  channel2,
  ch1Name = 'Channel 1 (Source X)',
  ch2Name = 'Channel 2 (Target Y)',
}) => {
  const [lagK, setLagK] = useState<number>(1);
  const [nBins, setNBins] = useState<number>(4);

  const te: TransferEntropyResult = computeNonlinearTransferEntropy(channel1, channel2, lagK, nBins);

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-5 space-y-4 shadow-2xs font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DDD6C7]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Nonlinear Information Dynamics
            </span>
            <h3 className="text-sm font-bold text-[#1F2430]">
              Model-Free Nonlinear Transfer Entropy (T_X→Y)
            </h3>
          </div>
          <p className="text-xs text-[#6B6F7B]">
            Shannon conditional mutual information quantifying directed causal flow without linear autoregressive assumptions (Schreiber, 2000).
          </p>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[#6B6F7B]">Lag k:</span>
          {[1, 2, 3].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setLagK(k)}
              className={`px-2 py-0.5 rounded border ${
                lagK === k ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              k = {k}
            </button>
          ))}
          <span className="text-[#6B6F7B] ml-2">Bins:</span>
          {[3, 4, 6].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setNBins(b)}
              className={`px-2 py-0.5 rounded border ${
                nBins === b ? 'bg-[#0F766E] text-white border-[#0F766E] font-bold' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* KaTeX Math Banner */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="text-[#1F2430] overflow-x-auto">
          <MathFormula
            formula="T_{X \to Y} = \sum p(y_{t+1}, y_t^{(k)}, x_t^{(l)}) \log_2 \frac{p(y_{t+1} \mid y_t^{(k)}, x_t^{(l)})}{p(y_{t+1} \mid y_t^{(k)})}, \quad \Delta T = T_{X \to Y} - T_{Y \to X}"
            displayMode={false}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${
              te.pValue < 0.05
                ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]/30'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30'
            }`}
          >
            {te.pValue < 0.05 ? `Directional Coupling Confirmed (p < ${te.pValue})` : 'Coupling Not Significant'}
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Forward Flow T_X→Y</div>
          <div className="text-xl font-bold text-[#0F766E]">{te.tXY.toFixed(4)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">bits / sample</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Reverse Flow T_Y→X</div>
          <div className="text-xl font-bold text-[#6B6F7B]">{te.tYX.toFixed(4)}</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">bits / sample</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Net Asymmetry (ΔT)</div>
          <div className="text-xl font-bold text-[#4338CA]">
            {te.netAsymmetry > 0 ? `+${te.netAsymmetry}` : te.netAsymmetry}
          </div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">{te.dominantDirection}</div>
        </div>
        <div className="p-2.5 rounded bg-[#F8F6F1] border border-[#DDD6C7] text-center">
          <div className="text-[10px] uppercase text-[#6B6F7B]">Null Z-Score</div>
          <div className="text-xl font-bold text-[#D97706]">{te.zScore.toFixed(2)}σ</div>
          <div className="text-[10px] text-[#6B6F7B] mt-0.5">p = {te.pValue.toFixed(3)}</div>
        </div>
      </div>

      {/* Directional Information Flow Wheel & Asymmetry Visualizer */}
      <div className="h-72 rounded-md bg-[#FFFDF9] border border-[#DDD6C7] p-4 flex flex-col justify-between relative shadow-2xs font-mono">
        <div className="text-[10px] text-[#6B6F7B] flex justify-between border-b border-[#DDD6C7] pb-1">
          <span>DIRECTIONAL INFORMATION TRANSMISSION (BITS)</span>
          <span>Permutation Null Threshold = {te.surrogateThreshold} bits</span>
        </div>

        {/* Dual Channel Transmission Diagram */}
        <div className="flex-1 flex items-center justify-around py-4">
          {/* Node X */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-18 h-18 rounded-full bg-[#E6F4F2] border-2 border-[#0F766E] flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-xs font-bold text-[#0F766E]">X</span>
              <span className="text-[9px] text-[#4A5060] font-sans">Source</span>
            </div>
            <span className="text-[11px] font-bold text-[#1F2430] max-w-[120px] text-center truncate">
              {ch1Name}
            </span>
          </div>

          {/* Center Transmission Pipes */}
          <div className="flex-1 max-w-sm px-4 space-y-4">
            {/* Forward Pipe (X -> Y) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-[#0F766E] flex items-center gap-1">
                  Forward T_X→Y <ArrowRight className="w-3.5 h-3.5 inline" />
                </span>
                <span className="font-bold text-[#0F766E]">{te.tXY} bits</span>
              </div>
              <div className="h-4 bg-[#F6F3EC] rounded-full border border-[#DDD6C7] overflow-hidden p-0.5">
                <div
                  className="h-full bg-[#0F766E] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (te.tXY / 0.3) * 100)}%` }}
                />
              </div>
            </div>

            {/* Reverse Pipe (Y -> X) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-bold text-[#6B6F7B] flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5 inline" /> Reverse T_Y→X
                </span>
                <span className="font-bold text-[#6B6F7B]">{te.tYX} bits</span>
              </div>
              <div className="h-4 bg-[#F6F3EC] rounded-full border border-[#DDD6C7] overflow-hidden p-0.5">
                <div
                  className="h-full bg-[#6B6F7B] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (te.tYX / 0.3) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Node Y */}
          <div className="flex flex-col items-center space-y-2">
            <div className="w-18 h-18 rounded-full bg-[#F6F3EC] border-2 border-[#4338CA] flex flex-col items-center justify-center text-center shadow-xs">
              <span className="text-xs font-bold text-[#4338CA]">Y</span>
              <span className="text-[9px] text-[#4A5060] font-sans">Target</span>
            </div>
            <span className="text-[11px] font-bold text-[#1F2430] max-w-[120px] text-center truncate">
              {ch2Name}
            </span>
          </div>
        </div>

        {/* Bottom Legend */}
        <div className="flex items-center justify-between text-[10px] text-[#6B6F7B] border-t border-[#DDD6C7] pt-2">
          <span>Direction: {te.dominantDirection}</span>
          <span className="text-[#0F766E] font-bold">
            Significance: Z = {te.zScore}σ (Surrogate p = {te.pValue.toFixed(3)})
          </span>
        </div>
      </div>
    </div>
  );
};
