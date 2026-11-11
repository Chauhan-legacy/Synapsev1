import React, { useState, useEffect } from 'react';
import { useSignal } from '../context/SignalContext';
import { InteractiveChart } from '../components/common/InteractiveChart';
import { UPlotTimeSeriesChart } from '../components/charts/UPlotTimeSeriesChart';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import {
  BookmarkPlus,
  Zap,
  Activity,
  Table as TableIcon,
  Layers,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  computePreviewFftWorker,
  exploreTableWithArquero,
  computePcaPreviewWorker,
  PreviewFftResult,
  ArqueroSummaryResult,
  PcaPreviewResult,
} from '../services/hybridComputeService';

export const ExplorerView: React.FC = () => {
  const { activeSignal } = useSignal();
  const [selectedChannel, setSelectedChannel] = useState<string>(activeSignal.channelNames[0] || 'Channel 1');
  const [showAllChannels, setShowAllChannels] = useState<boolean>(true);
  const [renderEngine, setRenderEngine] = useState<'uplot' | 'svg'>('uplot');

  const [annotations, setAnnotations] = useState<Array<{ time: number; note: string }>>([]);
  const [newNote, setNewNote] = useState('');

  // Worker Compute State
  const [fftResult, setFftResult] = useState<PreviewFftResult | null>(null);
  const [isFftRunning, setIsFftRunning] = useState<boolean>(false);
  const [fftWindow, setFftWindow] = useState<'hann' | 'hamming' | 'blackman' | 'rectangular'>('hann');

  const [arqueroResult, setArqueroResult] = useState<ArqueroSummaryResult | null>(null);
  const [pcaResult, setPcaResult] = useState<PcaPreviewResult | null>(null);

  const vals = activeSignal.channels[selectedChannel] || [];
  const times = activeSignal.timestamps || [];

  // Update selected channel when active signal changes
  useEffect(() => {
    if (!activeSignal.channelNames.includes(selectedChannel)) {
      setSelectedChannel(activeSignal.channelNames[0] || 'Channel 1');
    }
  }, [activeSignal, selectedChannel]);

  // Run Worker FFT Preview whenever selected channel or window changes
  useEffect(() => {
    let isCancelled = false;
    if (vals.length >= 8) {
      setIsFftRunning(true);
      computePreviewFftWorker(vals, activeSignal.samplingRate, fftWindow)
        .then((res) => {
          if (!isCancelled) {
            setFftResult(res);
            setIsFftRunning(false);
          }
        })
        .catch(() => {
          if (!isCancelled) setIsFftRunning(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [vals, activeSignal.samplingRate, fftWindow]);

  // Run Arquero Tabular Summary
  useEffect(() => {
    let isCancelled = false;
    if (activeSignal.channelNames.length > 0) {
      exploreTableWithArquero(activeSignal.channels, undefined, 20)
        .then((res) => {
          if (!isCancelled) setArqueroResult(res);
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [activeSignal]);

  // Run ml-matrix PCA preview if multi-channel
  useEffect(() => {
    let isCancelled = false;
    if (activeSignal.channelNames.length > 1) {
      computePcaPreviewWorker(activeSignal.channelNames, activeSignal.channels)
        .then((res) => {
          if (!isCancelled) setPcaResult(res);
        })
        .catch(() => {});
    } else {
      setPcaResult(null);
    }
    return () => {
      isCancelled = true;
    };
  }, [activeSignal]);

  const handleAddAnnotation = () => {
    if (!newNote.trim()) return;
    const midTime = times[Math.floor(times.length / 2)] || 0;
    setAnnotations([...annotations, { time: midTime, note: newNote }]);
    setNewNote('');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Signal Explorer &amp; Microstructure Inspection</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] font-bold">
              Hybrid Web Worker &amp; Canvas Engine
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Full-resolution interactive zooming, mouse drag magnification, multi-channel overlays, and instant Web Worker FFT.
          </p>
        </div>

        {/* Engine & Channel Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Engine Selector */}
          <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
            <button
              type="button"
              onClick={() => setRenderEngine('uplot')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                renderEngine === 'uplot'
                  ? 'bg-[#0F766E] text-white font-bold shadow-2xs'
                  : 'text-[#57534E] hover:text-[#1F2430]'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>uPlot Canvas (60 FPS)</span>
            </button>
            <button
              type="button"
              onClick={() => setRenderEngine('svg')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                renderEngine === 'svg'
                  ? 'bg-[#FFFFFF] text-[#1F2430] font-bold shadow-2xs border border-[#DDD6C7]'
                  : 'text-[#57534E] hover:text-[#1F2430]'
              }`}
            >
              <span>SVG Recharts</span>
            </button>
          </div>

          {/* Multi-Channel Toggle */}
          {activeSignal.channelNames.length > 1 && renderEngine === 'uplot' && (
            <button
              type="button"
              onClick={() => setShowAllChannels(!showAllChannels)}
              className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors flex items-center gap-1 ${
                showAllChannels
                  ? 'bg-[#0F766E]/15 border-[#0F766E] text-[#0F766E] font-bold'
                  : 'bg-[#FFFDF9] border-[#DDD6C7] text-[#57534E]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{showAllChannels ? 'All Channels Overlay' : 'Single Channel'}</span>
            </button>
          )}

          {/* Channel Selector */}
          {(!showAllChannels || renderEngine === 'svg') && activeSignal.channelNames.length > 1 && (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-[#78716C]">Channel:</span>
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="bg-[#FFFDF9] border border-[#DDD6C7] rounded px-2 py-1 text-[#1F2430] focus:outline-none"
              >
                {activeSignal.channelNames.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <CollapsibleExplainer title="How to use the Signal Explorer & Canvas Engine?">
        The hardware-accelerated uPlot canvas renders up to 1,000,000 data points smoothly with zero main-thread freezing.
        Click and drag horizontally on the canvas to zoom in on transient features; double-click or use &quot;Reset Zoom&quot; to restore the full duration.
        All calculations below are offloaded to dedicated Web Workers to ensure 60 FPS UI interaction.
      </CollapsibleExplainer>

      {/* Main Chart Section */}
      {renderEngine === 'uplot' ? (
        <UPlotTimeSeriesChart
          timestamps={times}
          channels={
            showAllChannels
              ? activeSignal.channels
              : { [selectedChannel]: vals }
          }
          channelNames={
            showAllChannels
              ? activeSignal.channelNames
              : [selectedChannel]
          }
          height={340}
          title={`${activeSignal.filename} — ${showAllChannels ? 'Multi-Channel Overlay' : selectedChannel}`}
        />
      ) : (
        <InteractiveChart
          title={`${activeSignal.filename} — ${selectedChannel}`}
          xValues={times}
          xLabel="Time (seconds)"
          yLabel="Observed Value"
          series={[{ name: selectedChannel, data: vals }]}
          accessibleSummary={`Full resolution inspection of ${selectedChannel} across ${times.length} samples`}
          height={320}
        />
      )}

      {/* Worker Compute Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Web Worker Preview FFT (fft.js) */}
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 font-mono text-xs shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0F766E]" />
              <span className="font-bold text-[#1F2430]">Real-Time FFT Preview (fft.js Worker)</span>
            </div>
            {/* Window selector */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-[#78716C]">Window:</span>
              <select
                value={fftWindow}
                onChange={(e) => setFftWindow(e.target.value as any)}
                className="bg-[#EFEBE0] border border-[#DDD6C7] rounded px-1.5 py-0.5 text-[#1F2430] text-[10px]"
              >
                <option value="hann">Hann</option>
                <option value="hamming">Hamming</option>
                <option value="blackman">Blackman</option>
                <option value="rectangular">Rectangular</option>
              </select>
            </div>
          </div>

          {fftResult ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7]">
                  <div className="text-[10px] text-[#78716C] uppercase font-bold">Peak Frequency</div>
                  <div className="text-sm font-bold text-[#0F766E] mt-0.5">
                    {fftResult.peakFreq.toFixed(2)} Hz
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7]">
                  <div className="text-[10px] text-[#78716C] uppercase font-bold">Peak Power</div>
                  <div className="text-sm font-bold text-[#1F2430] mt-0.5">
                    {fftResult.peakPsd.toFixed(4)}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7]">
                  <div className="text-[10px] text-[#78716C] uppercase font-bold">FFT Size (N)</div>
                  <div className="text-sm font-bold text-[#1F2430] mt-0.5">
                    {fftResult.nFft.toLocaleString()}
                  </div>
                </div>
                <div className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7]">
                  <div className="text-[10px] text-[#78716C] uppercase font-bold">Freq Bin (Δf)</div>
                  <div className="text-sm font-bold text-[#1F2430] mt-0.5">
                    {(activeSignal.samplingRate / fftResult.nFft).toFixed(3)} Hz
                  </div>
                </div>
              </div>

              {/* Sparkline spectrum */}
              <div className="h-16 w-full flex items-end gap-[1px] bg-[#F6F3EC] p-1.5 rounded border border-[#E6DFC6] overflow-hidden">
                {Array.from({ length: 48 }).map((_, i) => {
                  const binIdx = Math.floor((i / 48) * (fftResult.numBins / 2));
                  const pVal = fftResult.psd[binIdx] || 0;
                  const maxP = fftResult.peakPsd || 1;
                  const barH = Math.max(4, Math.min(100, (pVal / maxP) * 100));
                  return (
                    <div
                      key={i}
                      style={{ height: `${barH}%` }}
                      className="flex-1 bg-[#0F766E]/70 hover:bg-[#0F766E] rounded-t-xs transition-colors"
                      title={`${fftResult.frequencies[binIdx]?.toFixed(1)} Hz: ${pVal.toFixed(4)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-[#78716C]">
                <span>0.0 Hz (DC)</span>
                <span>{(activeSignal.samplingRate / 4).toFixed(1)} Hz</span>
                <span>{(activeSignal.samplingRate / 2).toFixed(1)} Hz (Nyquist)</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-[#78716C]">
              {isFftRunning ? 'Computing FFT in Web Worker...' : 'Insufficient samples for FFT.'}
            </div>
          )}
        </div>

        {/* Card 2: Tabular Exploration & PCA Preview (Arquero & ml-matrix) */}
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 font-mono text-xs shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-[#B45F1B]" />
              <span className="font-bold text-[#1F2430]">Tabular Schema &amp; PCA (Arquero + ml-matrix)</span>
            </div>
            <span className="text-[10px] text-[#78716C]">Zero-Copy Transferred</span>
          </div>

          {/* PCA Preview if multi-channel */}
          {pcaResult ? (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-[#1F2430] flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-[#0F766E]" />
                <span>Multi-Channel Principal Component Variance:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                {pcaResult.explainedVarianceRatio.slice(0, 3).map((ratio, idx) => (
                  <div key={idx} className="p-2 rounded bg-[#F8F6F1] border border-[#DDD6C7]">
                    <div className="text-[#78716C] uppercase font-bold">PC {idx + 1}</div>
                    <div className="text-sm font-bold text-[#0F766E] mt-0.5">
                      {(ratio * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Arquero Tabular Preview */}
          {arqueroResult ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#78716C]">
                  Total Rows: <strong className="text-[#1F2430]">{arqueroResult.totalRows.toLocaleString()}</strong> across{' '}
                  <strong className="text-[#1F2430]">{arqueroResult.columnNames.length}</strong> columns
                </span>
                <span className="text-[10px] text-[#0F766E] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Columnar Arrow View
                </span>
              </div>

              <div className="overflow-x-auto max-h-36 border border-[#DDD6C7] rounded bg-[#FFFDF9]">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-[#EFEBE0] text-[#1F2430] font-bold border-b border-[#DDD6C7]">
                    <tr>
                      <th className="p-1.5">Row</th>
                      {arqueroResult.columnNames.map((col) => (
                        <th key={col} className="p-1.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFEBE0] text-[#57534E]">
                    {arqueroResult.previewRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F8F6F1]">
                        <td className="p-1.5 font-bold text-[#78716C]">{idx + 1}</td>
                        {arqueroResult.columnNames.map((col) => (
                          <td key={col} className="p-1.5 whitespace-nowrap font-mono">
                            {typeof row[col] === 'number' ? row[col].toFixed(4) : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-[#78716C]">Loading Arquero table representation...</div>
          )}
        </div>
      </div>

      <ExportBar title="Signal Explorer" data={{ filename: activeSignal.filename, channel: selectedChannel }} />

      {/* Manual Annotations Bar */}
      <div className="bg-[#FFFDF9] border border-[#DDD6C7] rounded-xl p-3.5 space-y-2 font-mono text-xs shadow-xs">
        <div className="flex items-center gap-2 font-bold text-[#1F2430]">
          <BookmarkPlus className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>Add Scientific Annotation</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type an observation note (e.g., 'Transient dip at t=4.5s')..."
            className="flex-1 bg-[#F8F6F1] border border-[#DDD6C7] rounded px-3 py-1.5 text-xs text-[#1F2430] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          />
          <button
            type="button"
            onClick={handleAddAnnotation}
            className="px-3.5 py-1.5 text-xs font-bold bg-[#0F766E] hover:bg-[#0B5E58] text-white rounded transition-colors"
          >
            Add Note
          </button>
        </div>

        {annotations.length > 0 && (
          <div className="divide-y divide-[#EFEBE0] text-xs pt-2">
            {annotations.map((ann, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between text-[#57534E]">
                <span>{ann.note}</span>
                <span className="font-mono text-[#78716C] text-[11px]">t ~ {ann.time.toFixed(2)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorerView;
