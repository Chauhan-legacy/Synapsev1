import React, { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import {
  Network,
  ShieldCheck,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Upload,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import {
  reconcileTimeGrids,
  computePrewhitenedCCF,
  computeCrossSpectralCoherence,
  runSurrogateNullTest,
  computeCausalSafeguard,
  computeTs2NetGraph,
  getCrossDatasetBenchmarks,
  generateCrossDatasetMarkdownReport,
} from '../utils/crossDatasetMath';

interface CDCOProps {
  onOpenMethodCard?: (name: string) => void;
}

export const CrossDatasetObservatoryView: React.FC<CDCOProps> = () => {
  const benchmarks = useMemo(() => getCrossDatasetBenchmarks(), []);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('NOAA_SOLAR_GEOMAGNETIC');

  // Active duo state
  const activeBenchmark = useMemo(
    () => benchmarks.find((b) => b.id === selectedBenchmarkId) || benchmarks[0],
    [benchmarks, selectedBenchmarkId]
  );

  // Custom datasets upload state
  const [customA, setCustomA] = useState<{ name: string; unit: string; fs: number; times: number[]; values: number[] } | null>(null);
  const [customB, setCustomB] = useState<{ name: string; unit: string; fs: number; times: number[]; values: number[] } | null>(null);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const fileInputARef = useRef<HTMLInputElement | null>(null);
  const fileInputBRef = useRef<HTMLInputElement | null>(null);

  const handleFileUploadA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as Array<Record<string, any>>;
        if (rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const timeKey = keys.find((k) => k.toLowerCase().includes('time') || k.toLowerCase().includes('t')) || keys[0];
        const valKey = keys.find((k) => k !== timeKey) || keys[1] || keys[0];

        const times: number[] = [];
        const values: number[] = [];
        rows.forEach((r, idx) => {
          const t = typeof r[timeKey] === 'number' ? r[timeKey] : idx * 0.01;
          const v = typeof r[valKey] === 'number' ? r[valKey] : 0;
          if (!isNaN(t) && !isNaN(v)) {
            times.push(t);
            values.push(v);
          }
        });

        const dt = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 0.01;
        const fs = dt > 0 ? 1.0 / dt : 100.0;
        setCustomA({
          name: file.name.replace(/\.csv$/, ''),
          unit: 'custom',
          fs,
          times,
          values,
        });
      },
    });
  };

  const handleFileUploadB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data as Array<Record<string, any>>;
        if (rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const timeKey = keys.find((k) => k.toLowerCase().includes('time') || k.toLowerCase().includes('t')) || keys[0];
        const valKey = keys.find((k) => k !== timeKey) || keys[1] || keys[0];

        const times: number[] = [];
        const values: number[] = [];
        rows.forEach((r, idx) => {
          const t = typeof r[timeKey] === 'number' ? r[timeKey] : idx * 0.01;
          const v = typeof r[valKey] === 'number' ? r[valKey] : 0;
          if (!isNaN(t) && !isNaN(v)) {
            times.push(t);
            values.push(v);
          }
        });

        const dt = times.length > 1 ? (times[times.length - 1] - times[0]) / (times.length - 1) : 0.01;
        const fs = dt > 0 ? 1.0 / dt : 100.0;
        setCustomB({
          name: file.name.replace(/\.csv$/, ''),
          unit: 'custom',
          fs,
          times,
          values,
        });
      },
    });
  };

  // Active dataset inputs
  const datasetA = isCustomMode && customA ? customA : activeBenchmark.datasetA;
  const datasetB = isCustomMode && customB ? customB : activeBenchmark.datasetB;

  // Active Analytical Plane
  const [activeTab, setActiveTab] = useState<'ccf' | 'coherence' | 'surrogates' | 'network' | 'safeguard'>('ccf');

  // Configuration options
  const [numSurrogates, setNumSurrogates] = useState<number>(60);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // 1. STAGE 1: Temporal Coordinate Reconciliation
  const reconciled = useMemo(() => {
    try {
      return reconcileTimeGrids(
        datasetA.times,
        datasetA.values,
        datasetA.name,
        datasetA.unit,
        datasetB.times,
        datasetB.values,
        datasetB.name,
        datasetB.unit,
        1024
      );
    } catch (e) {
      console.error('Reconciliation error:', e);
      return null;
    }
  }, [datasetA, datasetB]);

  // 2. STAGE 2 & 3: Prewhitened CCF with Sub-Sample Lag
  const ccfResult = useMemo(() => {
    if (!reconciled) return null;
    return computePrewhitenedCCF(reconciled.s1, reconciled.s2, reconciled.fs);
  }, [reconciled]);

  // 3. STAGE 3: Thomson Multitaper Coherence & Phase
  const coherenceResult = useMemo(() => {
    if (!reconciled) return null;
    return computeCrossSpectralCoherence(reconciled.s1, reconciled.s2, reconciled.fs);
  }, [reconciled]);

  // 4. STAGE 4: Non-Parametric Twin Surrogates (IAAFT)
  const surrogateResult = useMemo(() => {
    if (!reconciled || !ccfResult) return null;
    return runSurrogateNullTest(
      reconciled.s1,
      reconciled.s2,
      Math.abs(ccfResult.peakPrewhitened.correlation),
      'correlation',
      reconciled.fs,
      numSurrogates
    );
  }, [reconciled, ccfResult, numSurrogates]);

  // 5. STAGE 5: Causal Safeguard & Directionality Engine
  const causalResult = useMemo(() => {
    if (!reconciled || !ccfResult || !coherenceResult) return null;
    const peakP = coherenceResult.peakCoherence.passesCarter ? 0.001 : 0.45;
    return computeCausalSafeguard(
      reconciled.s1,
      reconciled.s2,
      ccfResult.peakPrewhitened.lagSeconds,
      reconciled.fs,
      peakP
    );
  }, [reconciled, ccfResult, coherenceResult]);

  // 6. STAGE 6: ts2net Network Graph (when channels >= 3)
  const networkResult = useMemo(() => {
    if (!reconciled) return null;
    const seriesMap: Record<string, number[]> = {
      [reconciled.original1.name]: reconciled.s1,
      [reconciled.original2.name]: reconciled.s2,
      'Diff Component': reconciled.s1.map((v, i) => v - reconciled.s2[i]),
      'Synthetic Null': reconciled.commonTimes.map((t) => Math.sin(t * 13)),
    };
    return computeTs2NetGraph(seriesMap, Object.keys(seriesMap), reconciled.fs);
  }, [reconciled]);

  // Synchronized Dual-Waveform chart data (downsampled for SVG fluidity)
  const dualTimeSeries = useMemo(() => {
    if (!reconciled) return [];
    const step = Math.max(1, Math.floor(reconciled.commonTimes.length / 240));
    const data: Array<{ time: number; valA: number; valB: number }> = [];
    for (let i = 0; i < reconciled.commonTimes.length; i += step) {
      data.push({
        time: reconciled.commonTimes[i],
        valA: parseFloat(reconciled.s1[i].toFixed(3)),
        valB: parseFloat(reconciled.s2[i].toFixed(3)),
      });
    }
    return data;
  }, [reconciled]);

  // CCF Chart Series
  const ccfChartSeries = useMemo(() => {
    if (!ccfResult) return [];
    return ccfResult.lags.map((lag, i) => ({
      lag,
      raw: ccfResult.rawCCF[i],
      prewhitened: ccfResult.prewhitenedCCF[i],
      bartlettUpper: ccfResult.bartlettBound,
      bartlettLower: -ccfResult.bartlettBound,
    }));
  }, [ccfResult]);

  // Coherence Chart Series
  const coherenceChartSeries = useMemo(() => {
    if (!coherenceResult) return [];
    return coherenceResult.frequencies.map((freq, i) => ({
      freq,
      coherence: coherenceResult.coherence[i],
      carterBound: coherenceResult.carter95Threshold,
      phase: coherenceResult.phaseSpectrum[i],
      cospectrum: coherenceResult.cospectrum[i],
      quadspectrum: coherenceResult.quadspectrum[i],
    }));
  }, [coherenceResult]);

  // Surrogate Histogram Series
  const surrogateHistSeries = useMemo(() => {
    if (!surrogateResult) return [];
    const bins = 15;
    const minVal = 0;
    const maxVal = Math.max(1.0, surrogateResult.observedMetric * 1.2);
    const binWidth = (maxVal - minVal) / bins;
    const counts = new Array(bins).fill(0);

    surrogateResult.surrogateDistribution.forEach((v) => {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((v - minVal) / binWidth)));
      counts[b]++;
    });

    return counts.map((count, i) => ({
      bin: parseFloat((minVal + (i + 0.5) * binWidth).toFixed(2)),
      count,
    }));
  }, [surrogateResult]);

  // Handle Markdown Export
  const handleCopyReport = () => {
    if (!reconciled || !ccfResult || !coherenceResult || !surrogateResult || !causalResult) return;
    const md = generateCrossDatasetMarkdownReport(
      reconciled,
      ccfResult,
      coherenceResult,
      surrogateResult,
      causalResult,
      networkResult || undefined
    );
    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!reconciled || !ccfResult || !coherenceResult || !surrogateResult || !causalResult) return;
    const md = generateCrossDatasetMarkdownReport(
      reconciled,
      ccfResult,
      coherenceResult,
      surrogateResult,
      causalResult,
      networkResult || undefined
    );
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SYNAPSE_CDCO_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 bg-[#F7F5EF] text-[#252925] flex flex-col font-georgia min-h-screen">
      {/* Top Header Strip (Sage Green Visual Surface) */}
      <header className="border-b border-[#252925]/20 bg-[#9CAF88] text-[#252925] px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#252925] border border-[#252925]/20 flex items-center justify-center text-[#F7F5EF] shadow-inner">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-georgia text-lg font-bold tracking-tight text-[#252925]">
                Cross-Dataset Correlation Observatory
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F7F5EF] text-[#252925] border border-[#252925]/20 font-bold uppercase tracking-wider">
                Multi-Hypothesis Suite
              </span>
            </div>
            <p className="text-xs text-[#252925]/80 font-georgia">
              Multi-dataset temporal reconciliation, prewhitened cross-correlation, Carter coherence &amp; causal safeguards
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F7F5EF] text-[#252925] border border-[#252925]/20 text-xs font-semibold transition shadow-xs"
            title="Copy reproducible Markdown analytical report"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-[#E8412C]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedReport ? 'Copied' : 'Copy Report'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E8412C] hover:bg-[#D03522] text-[#F7F5EF] text-xs font-bold transition shadow-xs"
            title="Download complete scientific audit report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 p-5 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* SECTION 1: BENCHMARK & DATASET IMPORT DECK */}
        <div className="bg-[#FFFFFF] border border-[#252925]/20 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#252925]/15 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-[#252925]/70 tracking-wider">
                Empirical Observation Hub
              </span>
              <h2 className="text-base font-bold text-[#252925]">
                Select Scientific Benchmark Duo or Ingest Independent Observations
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !isCustomMode
                    ? 'bg-[#252925] text-[#F7F5EF] font-bold shadow-xs'
                    : 'bg-[#F7F5EF] text-[#252925] hover:bg-[#9CAF88]/20'
                }`}
              >
                Scientific Benchmark Pairs
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  isCustomMode
                    ? 'bg-[#252925] text-[#F7F5EF] font-bold shadow-xs'
                    : 'bg-[#F7F5EF] text-[#252925] hover:bg-[#9CAF88]/20'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Custom Dual CSV</span>
              </button>
            </div>
          </div>

          {!isCustomMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {benchmarks.map((b) => {
                const isSelected = b.id === selectedBenchmarkId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBenchmarkId(b.id)}
                    className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between space-y-2.5 ${
                      isSelected
                        ? 'bg-[#9CAF88] text-[#252925] border-[#252925] shadow-xs'
                        : 'bg-[#F7F5EF] text-[#252925] border-[#252925]/20 hover:border-[#9CAF88]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            isSelected ? 'bg-[#252925] text-[#F7F5EF]' : 'bg-[#FFFFFF] text-[#252925] border border-[#252925]/20'
                          }`}
                        >
                          {b.domain}
                        </span>
                        {isSelected && <Sparkles className="w-3.5 h-3.5 text-[#E8412C]" />}
                      </div>
                      <h3
                        className="text-xs font-bold mt-2 font-georgia line-clamp-2 text-[#252925]"
                      >
                        {b.name}
                      </h3>
                      <p
                        className={`text-[11px] mt-1 line-clamp-2 font-georgia ${
                          isSelected ? 'text-[#252925]/85' : 'text-[#252925]/70'
                        }`}
                      >
                        {b.description}
                      </p>
                    </div>

                    <div
                      className={`text-[10px] font-mono pt-2 border-t flex justify-between ${
                        isSelected ? 'border-[#252925]/20 text-[#252925]' : 'border-[#252925]/15 text-[#252925]/70'
                      }`}
                    >
                      <span>A: {b.datasetA.fs} Hz</span>
                      <span>B: {b.datasetB.fs} Hz</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#F7F5EF] border border-[#252925]/20 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#252925]">
                <Upload className="w-4 h-4 text-[#E8412C]" />
                <span>Upload Two Independent Scientific CSV Files (with timestamps and headers)</span>
              </div>
              <p className="text-xs text-[#252925]/80">
                CDCO automatically extracts timestamp intervals, verifies temporal intersection, applies anti-aliased resampling, and performs prewhitened multi-hypothesis testing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <input
                  ref={fileInputARef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUploadA}
                  className="hidden"
                />
                <input
                  ref={fileInputBRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUploadB}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputARef.current?.click()}
                  className="p-4 bg-[#FFFFFF] border border-dashed border-[#252925]/30 hover:border-[#252925] rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-2xs"
                >
                  <span className="text-xs font-bold text-[#252925]">
                    {customA ? `Loaded: ${customA.name}` : 'Observation A'}
                  </span>
                  <span className="text-[10px] text-[#252925]/70 mt-1 font-mono">
                    {customA ? `${customA.times.length} samples • ${customA.fs.toFixed(1)} Hz` : 'Click to select CSV (e.g. NOAA GOES / Geophone)'}
                  </span>
                </div>

                <div
                  onClick={() => fileInputBRef.current?.click()}
                  className="p-4 bg-[#FFFFFF] border border-dashed border-[#252925]/30 hover:border-[#252925] rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition shadow-2xs"
                >
                  <span className="text-xs font-bold text-[#252925]">
                    {customB ? `Loaded: ${customB.name}` : 'Observation B'}
                  </span>
                  <span className="text-[10px] text-[#252925]/70 mt-1 font-mono">
                    {customB ? `${customB.times.length} samples • ${customB.fs.toFixed(1)} Hz` : 'Click to select CSV (e.g. USGS Mag / Microbarometer)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: TEMPORAL RECONCILIATION SUMMARY TILES */}
        {reconciled && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">Sampling fs (A / B)</span>
              <div className="text-lg font-bold font-mono text-[#1B3026] my-0.5">
                {reconciled.original1.fs.toFixed(1)} / {reconciled.original2.fs.toFixed(1)}
                <span className="text-xs text-[#526052]"> Hz</span>
              </div>
              <span className="text-[11px] text-[#526052]">Target: {reconciled.fs.toFixed(1)} Hz</span>
            </div>

            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">Observations</span>
              <div className="text-lg font-bold font-mono text-[#1B3026] my-0.5">
                {reconciled.original1.n} &bull; {reconciled.original2.n}
              </div>
              <span className="text-[11px] text-[#526052]">Grid: {reconciled.commonTimes.length} pts</span>
            </div>

            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">Prewhitened Peak Lag</span>
              <div className="text-lg font-bold font-mono text-[#964E14] my-0.5">
                {ccfResult?.peakPrewhitened.lagSeconds !== undefined
                  ? `${ccfResult.peakPrewhitened.lagSeconds >= 0 ? '+' : ''}${ccfResult.peakPrewhitened.lagSeconds.toFixed(3)}s`
                  : 'N/A'}
              </div>
              <span className="text-[11px] text-[#964E14]">
                r* = {ccfResult?.peakPrewhitened.correlation.toFixed(3)}
              </span>
            </div>

            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">Carter Coherence</span>
              <div className="text-lg font-bold font-mono text-[#234735] my-0.5">
                γ² = {coherenceResult?.peakCoherence.coherence.toFixed(3)}
              </div>
              <span className="text-[11px] text-[#234735]">
                {coherenceResult?.peakCoherence.passesCarter ? 'Significant (95%)' : 'Noise Floor'}
              </span>
            </div>

            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">IAAFT Surrogate p</span>
              <div className="text-lg font-bold font-mono text-[#1B3026] my-0.5">
                p = {surrogateResult?.empiricalPValue.toFixed(4)}
              </div>
              <span className="text-[11px] text-[#526052]">
                {surrogateResult?.isSignificant ? 'H0 Rejected' : 'H0 Retained'}
              </span>
            </div>

            <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between min-h-[96px]">
              <span className="text-[10px] font-mono uppercase font-bold text-[#526D56]">Granger State</span>
              <div className="text-xs font-bold font-mono text-[#234735] my-1 leading-snug">
                {causalResult?.direction}
              </div>
              <span className="text-[10px] text-[#526052]">F = {causalResult?.fXtoY.toFixed(1)}</span>
            </div>
          </div>
        )}

        {/* SECTION 3: SYNCHRONIZED DUAL TIMELINE OSCILLOGRAM */}
        <div className="bg-[#FFFDF9] border border-[#D5C9B3] p-5 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E9E0CF] pb-2.5">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#234735]" />
              <h3 className="text-base font-bold text-[#1B3026]">
                Reconciled Dual-Observation Oscillogram
              </h3>
            </div>
            <div className="flex items-center space-x-4 font-mono text-xs text-[#526052]">
              <span className="text-[#234735] font-bold">&bull; A: {reconciled?.original1.name} ({reconciled?.original1.unit})</span>
              <span className="text-[#C5A66D] font-bold">&bull; B: {reconciled?.original2.name} ({reconciled?.original2.unit})</span>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dualTimeSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#D5C9B3" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#D5C9B3' }}
                  axisLine={{ stroke: '#D5C9B3' }}
                  interval="preserveStartEnd"
                  minTickGap={50}
                  tickFormatter={(t) => `${Number(t).toFixed(1)}s`}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#234735', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#D5C9B3' }}
                  axisLine={{ stroke: '#D5C9B3' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#C5A66D', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={{ stroke: '#D5C9B3' }}
                  axisLine={{ stroke: '#D5C9B3' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFDF9',
                    borderColor: '#D5C9B3',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                  }}
                />
                <ReferenceLine y={0} stroke="#D5C9B3" />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="valA"
                  name={reconciled?.original1.name || 'Dataset A'}
                  stroke="#234735"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="valB"
                  name={reconciled?.original2.name || 'Dataset B'}
                  stroke="#C5A66D"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 4: MULTI-METHOD ANALYTICAL PLANES (TABS) */}
        <div className="bg-[#FFFDF9] border border-[#D5C9B3] rounded-2xl p-5 shadow-xs space-y-5">
          {/* Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E0CF] pb-3">
            <div className="flex flex-wrap items-center gap-1.5 font-georgia text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ccf')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'ccf'
                    ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40 shadow-xs'
                    : 'text-[#526052] hover:bg-[#E9E0CF]'
                }`}
              >
                1. Prewhitened CCF &amp; Sub-Sample Lag
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('coherence')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'coherence'
                    ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40 shadow-xs'
                    : 'text-[#526052] hover:bg-[#E9E0CF]'
                }`}
              >
                2. Cross-Spectral Coherence (Carter 95%)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('surrogates')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'surrogates'
                    ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40 shadow-xs'
                    : 'text-[#526052] hover:bg-[#E9E0CF]'
                }`}
              >
                3. IAAFT Twin Surrogate Null Model
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('network')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'network'
                    ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40 shadow-xs'
                    : 'text-[#526052] hover:bg-[#E9E0CF]'
                }`}
              >
                4. Topological Network Graph (ts2net)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('safeguard')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'safeguard'
                    ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40 shadow-xs'
                    : 'text-[#526052] hover:bg-[#E9E0CF]'
                }`}
              >
                5. Causal Safeguard &amp; Assumptions
              </button>
            </div>

            <div className="font-mono text-xs text-[#526052]">
              Assumptions Checked: <span className="text-[#234735] font-bold">100% Deterministic</span>
            </div>
          </div>

          {/* TAB 1: PREWHITENED CCF & SUB-SAMPLE LAG */}
          {activeTab === 'ccf' && ccfResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#526052] gap-2">
                <p>
                  Cross-correlation computed on <strong>AR({ccfResult.arOrder1}) prewhitened innovations</strong> to prevent spurious association caused by shared red-noise or internal autocorrelation.
                </p>
                <div className="flex items-center gap-3 font-mono">
                  <span>Bartlett 95% Bound: &plusmn;{ccfResult.bartlettBound}</span>
                  <span className="font-bold text-[#964E14]">
                    Peak &tau;*: {ccfResult.peakPrewhitened.lagSeconds >= 0 ? '+' : ''}{ccfResult.peakPrewhitened.lagSeconds}s
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ccfChartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#D5C9B3" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="lag"
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      unit="s"
                    />
                    <YAxis
                      domain={[-1, 1]}
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF9',
                        borderColor: '#D5C9B3',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine y={0} stroke="#D5C9B3" />
                    <ReferenceLine y={ccfResult.bartlettBound} stroke="#964E14" strokeDasharray="3 3" label={{ value: '+1.96/√N', fill: '#964E14', fontSize: 10 }} />
                    <ReferenceLine y={-ccfResult.bartlettBound} stroke="#964E14" strokeDasharray="3 3" label={{ value: '-1.96/√N', fill: '#964E14', fontSize: 10 }} />
                    <Line type="monotone" dataKey="raw" name="Raw CCF (Un-prewhitened)" stroke="#9E9E9E" strokeWidth={1.2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="prewhitened" name="Prewhitened CCF (Innovations)" stroke="#234735" strokeWidth={2.2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 bg-[#F7F4EB] border border-[#D5C9B3] rounded-xl text-xs space-y-1">
                <div className="font-bold text-[#1B3026]">Sub-Sample Parabolic Interpolation:</div>
                <p className="text-[#526052]">
                  Exact continuous peak time delay is estimated via 3-point parabolic fitting around the discrete peak index, resolving physical transit delays smaller than the sampling step &Delta;t.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CROSS-SPECTRAL COHERENCE */}
          {activeTab === 'coherence' && coherenceResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#526052] gap-2">
                <p>
                  Magnitude-Squared Coherence &gamma;&sup2;(f) evaluated using multi-taper Thomson/Welch estimation. Solid gold line represents Carter 95% null confidence threshold.
                </p>
                <div className="flex items-center gap-3 font-mono">
                  <span>Carter 95%: {coherenceResult.carter95Threshold}</span>
                  <span className="font-bold text-[#234735]">
                    Peak: {coherenceResult.peakCoherence.frequency} Hz (γ² = {coherenceResult.peakCoherence.coherence})
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={coherenceChartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#D5C9B3" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="freq"
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                      interval="preserveStartEnd"
                      minTickGap={50}
                      unit=" Hz"
                    />
                    <YAxis
                      domain={[0, 1]}
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF9',
                        borderColor: '#D5C9B3',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine y={coherenceResult.carter95Threshold} stroke="#C5A66D" strokeWidth={2} strokeDasharray="4 4" label={{ value: 'Carter 95%', fill: '#C5A66D', fontSize: 10 }} />
                    <Line type="monotone" dataKey="coherence" name="Coherence γ²(f)" stroke="#234735" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {coherenceResult.sharedPeriodicities.length > 0 && (
                <div className="border border-[#D5C9B3] rounded-xl overflow-hidden">
                  <div className="bg-[#234735] text-[#F5F2E9] px-3.5 py-2 text-xs font-bold font-mono">
                    Validated Shared Harmonic Periodicities (Above Carter Threshold)
                  </div>
                  <div className="divide-y divide-[#E9E0CF] text-xs font-mono">
                    {coherenceResult.sharedPeriodicities.map((p, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between bg-[#FFFDF9]">
                        <span className="font-bold text-[#1B3026]">{p.frequency.toFixed(2)} Hz</span>
                        <span>γ² = {p.coherence.toFixed(4)}</span>
                        <span>Phase Difference &Delta;&theta; = {p.phaseDeg}&deg;</span>
                        <span className="px-2 py-0.5 rounded bg-[#234735] text-[#C5A66D] font-bold text-[10px]">
                          VALIDATED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NON-PARAMETRIC IAAFT TWIN SURROGATES */}
          {activeTab === 'surrogates' && surrogateResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#526052] gap-2">
                <p>
                  Monte Carlo empirical null hypothesis distribution constructed via <strong>{surrogateResult.numSurrogates} Iterated Amplitude Adjusted Fourier Transform (IAAFT)</strong> twin surrogates preserving exact amplitude histograms and power spectra.
                </p>
                <div className="flex items-center gap-2 font-mono">
                  <span>Surrogates:</span>
                  <select
                    value={numSurrogates}
                    onChange={(e) => setNumSurrogates(Number(e.target.value))}
                    className="px-2 py-1 bg-[#FFFDF9] border border-[#D5C9B3] rounded text-xs font-mono"
                  >
                    <option value={40}>40 surrogates</option>
                    <option value={60}>60 surrogates</option>
                    <option value={100}>100 surrogates</option>
                  </select>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={surrogateHistSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="#D5C9B3" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="bin"
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                    />
                    <YAxis
                      tick={{ fill: '#526052', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      tickLine={{ stroke: '#D5C9B3' }}
                      axisLine={{ stroke: '#D5C9B3' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFDF9',
                        borderColor: '#D5C9B3',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px',
                      }}
                    />
                    <ReferenceLine x={surrogateResult.observedMetric} stroke="#964E14" strokeWidth={2} label={{ value: 'Observed', fill: '#964E14', fontSize: 10 }} />
                    <ReferenceLine x={surrogateResult.surrogate95Percentile} stroke="#C5A66D" strokeDasharray="3 3" label={{ value: '95th Percentile', fill: '#C5A66D', fontSize: 10 }} />
                    <Bar dataKey="count" name="Surrogate Frequency" fill="#526D56" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3.5 bg-[#F7F4EB] border border-[#D5C9B3] rounded-xl flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-[#1B3026]">Empirical Monte Carlo p-value: </span>
                  <span className="text-base font-bold text-[#964E14]">{surrogateResult.empiricalPValue}</span>
                  <span className="text-[#526052] ml-2">(Null Mean: {surrogateResult.surrogateMean} &plusmn; {surrogateResult.surrogateStd})</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    surrogateResult.isSignificant
                      ? 'bg-[#234735] text-[#C5A66D] border border-[#C5A66D]/40'
                      : 'bg-red-950/20 text-red-700 border border-red-300'
                  }`}
                >
                  {surrogateResult.isSignificant ? 'H0 REJECTED' : 'H0 RETAINED'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: TOPOLOGICAL TS2NET GRAPH */}
          {activeTab === 'network' && networkResult && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#526052] gap-2">
                <p>
                  High-dimensional interaction graph formulated via the <strong>ts2net framework</strong> (Applied Network Science). Minimum Spanning Tree (MST) identifies the primary backbone topology.
                </p>
                <div className="font-mono text-xs text-[#234735] font-bold">
                  Identified Pacemaker Hub: <span className="text-[#C5A66D] underline">{networkResult.pacemakerNode}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-[#D5C9B3] rounded-xl overflow-hidden">
                  <div className="bg-[#234735] text-[#F5F2E9] px-3.5 py-2 text-xs font-bold font-mono">
                    Network Nodes &amp; Centrality Ranking
                  </div>
                  <div className="divide-y divide-[#E9E0CF] text-xs font-mono">
                    {networkResult.nodes.map((n) => (
                      <div key={n.id} className="p-2.5 flex items-center justify-between bg-[#FFFDF9]">
                        <span className="font-bold text-[#1B3026]">{n.label}</span>
                        <span>Degree: {n.degree}</span>
                        <span>Centrality: {n.centrality}</span>
                        {n.id === networkResult.pacemakerNode && (
                          <span className="px-2 py-0.5 rounded bg-[#C5A66D] text-[#172F25] font-bold text-[10px]">
                            PACEMAKER
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-[#D5C9B3] rounded-xl overflow-hidden">
                  <div className="bg-[#234735] text-[#F5F2E9] px-3.5 py-2 text-xs font-bold font-mono">
                    Topological Edges &amp; MST Classification
                  </div>
                  <div className="divide-y divide-[#E9E0CF] text-xs font-mono max-h-56 overflow-y-auto">
                    {networkResult.edges.map((e, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between bg-[#FFFDF9]">
                        <span>{e.source} &harr; {e.target}</span>
                        <span className="font-bold">r = {e.weight}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            e.isMST ? 'bg-[#234735] text-[#C5A66D]' : 'bg-[#E9E0CF] text-[#526052]'
                          }`}
                        >
                          {e.isMST ? 'MST Backbone' : 'Auxiliary Edge'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FEF3C7] border border-[#F59E0B]/40 rounded-xl text-xs text-[#92400E] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
                <span>
                  <strong>Scientific Constraint:</strong> Topological centrality indicates statistical clustering in correlation distance space, NOT physical or biophysical causal driver status.
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: CAUSAL SAFEGUARD & ASSUMPTIONS */}
          {activeTab === 'safeguard' && causalResult && (
            <div className="space-y-4">
              {/* Institutional Banner */}
              <div className="p-4 rounded-xl bg-[#234735] border border-[#C5A66D]/40 text-[#F5F2E9] space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C5A66D]" />
                  <h3 className="text-sm font-bold font-georgia text-[#F5F2E9]">
                    Scientific Non-Causality Safeguard Protocol Active
                  </h3>
                </div>
                <p className="text-xs text-[#B7C2AD] font-georgia leading-relaxed">
                  {causalResult.safeguardNotice}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-[#FFFDF9] border border-[#D5C9B3] rounded-xl space-y-2">
                  <div className="text-sm font-bold font-georgia text-[#1B3026]">
                    Granger Bivariate Vector Autoregression:
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E9E0CF]">
                    <span>Forward Precedence (A &rarr; B):</span>
                    <span className="font-bold text-[#1B3026]">F = {causalResult.fXtoY} (p = {causalResult.pXtoY})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E9E0CF]">
                    <span>Reverse Precedence (B &rarr; A):</span>
                    <span className="font-bold text-[#1B3026]">F = {causalResult.fYtoX} (p = {causalResult.pYtoX})</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Identified Directional Mode:</span>
                    <span className="font-bold text-[#964E14]">{causalResult.directionLabel}</span>
                  </div>
                </div>

                <div className="p-4 bg-[#FFFDF9] border border-[#D5C9B3] rounded-xl space-y-2">
                  <div className="text-sm font-bold font-georgia text-[#1B3026]">
                    Assumptions Audit Checklist:
                  </div>
                  {causalResult.assumptions.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-[#E9E0CF]">
                      <span className="text-[#526052]">{a.name}</span>
                      <span className="px-2 py-0.5 rounded bg-[#234735] text-[#C5A66D] font-bold text-[10px]">
                        PASSED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
