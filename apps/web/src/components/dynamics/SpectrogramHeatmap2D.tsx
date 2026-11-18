import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

export type ColormapTheme = 'botanical' | 'viridis' | 'inferno';

interface SpectrogramHeatmap2DProps {
  matrix: number[][]; // [timeIndex][freqIndex]
  timeLabels?: string[];
  freqLabels?: string[];
  isWavelet?: boolean;
}

// Colormap lookup functions (returns [r, g, b])
function getRgbForNorm(norm: number, theme: ColormapTheme): [number, number, number] {
  const t = Math.max(0, Math.min(1, norm));

  if (theme === 'botanical') {
    // Scientific Botanical: Deep Charcoal (0.0) -> Sage Green (0.4) -> Amber (0.75) -> Terracotta Ruby (1.0)
    if (t < 0.25) {
      const f = t / 0.25;
      return [
        Math.round(24 + f * (60 - 24)),
        Math.round(34 + f * (110 - 34)),
        Math.round(30 + f * (90 - 30)),
      ];
    } else if (t < 0.55) {
      const f = (t - 0.25) / 0.3;
      return [
        Math.round(60 + f * (156 - 60)),
        Math.round(110 + f * (175 - 110)),
        Math.round(90 + f * (136 - 90)),
      ];
    } else if (t < 0.8) {
      const f = (t - 0.55) / 0.25;
      return [
        Math.round(156 + f * (224 - 156)),
        Math.round(175 + f * (130 - 175)),
        Math.round(136 + f * (40 - 136)),
      ];
    } else {
      const f = (t - 0.8) / 0.2;
      return [
        Math.round(224 + f * (232 - 224)),
        Math.round(130 + f * (65 - 130)),
        Math.round(40 + f * (44 - 40)),
      ];
    }
  } else if (theme === 'inferno') {
    // Standard Inferno Colormap approximation
    if (t < 0.33) {
      const f = t / 0.33;
      return [Math.round(10 + f * 90), Math.round(5 + f * 10), Math.round(30 + f * 80)];
    } else if (t < 0.66) {
      const f = (t - 0.33) / 0.33;
      return [Math.round(100 + f * 120), Math.round(15 + f * 85), Math.round(110 - f * 80)];
    } else {
      const f = (t - 0.66) / 0.34;
      return [Math.round(220 + f * 35), Math.round(100 + f * 150), Math.round(30 + f * 120)];
    }
  } else {
    // Viridis Colormap approximation
    if (t < 0.33) {
      const f = t / 0.33;
      return [Math.round(68 - f * 20), Math.round(1 + f * 100), Math.round(84 + f * 70)];
    } else if (t < 0.66) {
      const f = (t - 0.33) / 0.33;
      return [Math.round(48 - f * 15), Math.round(101 + f * 75), Math.round(154 - f * 60)];
    } else {
      const f = (t - 0.66) / 0.34;
      return [Math.round(33 + f * 220), Math.round(176 + f * 60), Math.round(94 - f * 60)];
    }
  }
}

export const SpectrogramHeatmap2D: React.FC<SpectrogramHeatmap2DProps> = ({
  matrix = [],
  timeLabels = [],
  freqLabels = [],
  isWavelet = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Layout & Dimension state tracked by ResizeObserver
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 420,
    height: 260,
  });

  // Display modes
  const [colormap, setColormap] = useState<ColormapTheme>('botanical');
  const [smoothInterpolation, setSmoothInterpolation] = useState<boolean>(true);

  // Mouse hover state
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const nTimes = matrix?.length || 0;
  const nFreqs = matrix?.[0]?.length || 0;

  // 1. ResizeObserver: Dynamic re-measure on card resize, window resize, maximize/minimize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        setDimensions({
          width: Math.floor(entry.contentRect.width),
          height: Math.floor(entry.contentRect.height),
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Compute normalization limits across matrix
  const { minVal, maxVal, valRange } = useMemo(() => {
    if (nTimes === 0 || nFreqs === 0) return { minVal: 0, maxVal: 1, valRange: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < nTimes; t++) {
      const row = matrix[t];
      if (!row) continue;
      for (let f = 0; f < nFreqs; f++) {
        const val = row[f];
        if (typeof val === 'number' && !isNaN(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
    }
    if (min === Infinity) {
      min = 0;
      max = 1;
    }
    const range = max - min || 1;
    return { minVal: min, maxVal: max, valRange: range };
  }, [matrix, nTimes, nFreqs]);

  // Dimensions for components
  const yAxisWidth = 46; // fixed SVG left axis
  const xAxisHeight = 22; // fixed SVG bottom axis
  const colorbarWidth = 32; // fixed colorbar right axis
  const headerHeight = 26; // controls bar top

  const plotWidth = Math.max(40, dimensions.width - yAxisWidth - colorbarWidth);
  const plotHeight = Math.max(40, dimensions.height - xAxisHeight - headerHeight);

  // 2. High-DPI Canvas Rendering with Bilinear Interpolation
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nTimes === 0 || nFreqs === 0 || plotWidth <= 0 || plotHeight <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const canvasW = Math.round(plotWidth * dpr);
    const canvasH = Math.round(plotHeight * dpr);

    if (canvas.width !== canvasW || canvas.height !== canvasH) {
      canvas.width = canvasW;
      canvas.height = canvasH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create offscreen image buffer sized to matrix dimensions
    const offscreen = document.createElement('canvas');
    offscreen.width = nTimes;
    offscreen.height = nFreqs;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const imgData = offCtx.createImageData(nTimes, nFreqs);
    const data = imgData.data;

    // Fill pixel buffer (invert Y so lowest frequency is at bottom)
    for (let t = 0; t < nTimes; t++) {
      for (let f = 0; f < nFreqs; f++) {
        const val = matrix[t]?.[f] ?? minVal;
        const norm = Math.max(0, Math.min(1, (val - minVal) / valRange));
        const [r, g, b] = getRgbForNorm(norm, colormap);

        // Pixel index: row is (nFreqs - 1 - f), col is t
        const row = nFreqs - 1 - f;
        const idx = (row * nTimes + t) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
    }
    offCtx.putImageData(imgData, 0, 0);

    // Draw to main canvas with hardware GPU scaling
    ctx.save();
    ctx.imageSmoothingEnabled = smoothInterpolation;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(offscreen, 0, 0, canvasW, canvasH);
    ctx.restore();
  }, [matrix, minVal, valRange, colormap, smoothInterpolation, nTimes, nFreqs, plotWidth, plotHeight]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // 3. Coordinate mapping for mouse hover
  const hoverDetails = useMemo(() => {
    if (!mousePos || nTimes === 0 || nFreqs === 0) return null;
    const { x, y } = mousePos;

    if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return null;

    const tFrac = Math.max(0, Math.min(1, x / plotWidth));
    const fFrac = Math.max(0, Math.min(1, 1 - y / plotHeight));

    const tIdx = Math.min(nTimes - 1, Math.floor(tFrac * nTimes));
    const fIdx = Math.min(nFreqs - 1, Math.floor(fFrac * nFreqs));

    const rawVal = matrix[tIdx]?.[fIdx] ?? 0;
    const timeStr = timeLabels[tIdx] || `${(tFrac * 10).toFixed(2)}s`;
    const freqStr = freqLabels[fIdx] || `${(fFrac * 100).toFixed(1)} Hz`;

    return {
      x,
      y,
      timeStr,
      freqStr,
      value: rawVal,
      pct: ((rawVal - minVal) / valRange) * 100,
    };
  }, [mousePos, plotWidth, plotHeight, nTimes, nFreqs, matrix, timeLabels, freqLabels, minVal, valRange]);

  // 4. Tick Generation (4 to 6 evenly spaced ticks)
  const yTicks = useMemo(() => {
    if (nFreqs === 0) return [];
    const count = Math.min(5, nFreqs);
    const ticks: Array<{ y: number; label: string }> = [];
    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1 || 1);
      const fIdx = Math.round(frac * (nFreqs - 1));
      const y = plotHeight - frac * plotHeight;
      const label = freqLabels[fIdx] || `${(frac * 100).toFixed(0)} Hz`;
      ticks.push({ y, label });
    }
    return ticks;
  }, [nFreqs, plotHeight, freqLabels]);

  const xTicks = useMemo(() => {
    if (nTimes === 0) return [];
    const count = Math.min(6, nTimes);
    const ticks: Array<{ x: number; label: string }> = [];
    for (let i = 0; i < count; i++) {
      const frac = i / (count - 1 || 1);
      const tIdx = Math.round(frac * (nTimes - 1));
      const x = frac * plotWidth;
      const label = timeLabels[tIdx] || `${(frac * 10).toFixed(1)}s`;
      ticks.push({ x, label });
    }
    return ticks;
  }, [nTimes, plotWidth, timeLabels]);

  // Colorbar gradient CSS definition
  const colorbarGradient = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= 10; i++) {
      const norm = i / 10;
      const [r, g, b] = getRgbForNorm(norm, colormap);
      stops.push(`rgb(${r}, ${g}, ${b}) ${(norm * 100).toFixed(0)}%`);
    }
    // Colorbar displays top (max) to bottom (min)
    return `linear-gradient(to top, ${stops.join(', ')})`;
  }, [colormap]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col font-mono select-none overflow-hidden rounded-md border border-[#252925]/20 bg-[#F7F5EF] text-[#252925]"
    >
      {/* 1. Header Toolbar (Colormap, Interpolation Mode, Watermark) */}
      <div className="flex flex-wrap items-center justify-between px-2.5 py-1 text-[10px] border-b border-[#252925]/15 bg-[#FFFFFF]/70 shrink-0 gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-georgia font-bold text-xs text-[#252925] truncate">
            {isWavelet ? 'Wavelet Scalogram' : 'STFT Spectrogram'}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#9CAF88]/25 text-[#252925] font-bold text-[9px] border border-[#252925]/15 shrink-0 hidden sm:inline">
            {isWavelet ? 'CWT |W|²' : 'STFT |S|²'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Smooth vs Discrete Toggle */}
          <button
            type="button"
            onClick={() => setSmoothInterpolation(!smoothInterpolation)}
            className={`px-1.5 py-0.5 rounded text-[9px] transition-colors border ${
              smoothInterpolation
                ? 'bg-[#9CAF88]/30 border-[#252925]/30 text-[#252925] font-semibold'
                : 'bg-transparent border-[#252925]/20 text-[#252925]/70 hover:bg-[#F7F5EF]'
            }`}
            title={smoothInterpolation ? 'Bilinear Smooth Interpolation' : 'Raw Discrete Bins'}
          >
            {smoothInterpolation ? 'Smooth' : 'Discrete'}
          </button>

          {/* Colormap Selector */}
          <div className="flex items-center gap-1 text-[9px]">
            {(['botanical', 'inferno', 'viridis'] as ColormapTheme[]).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setColormap(theme)}
                className={`px-1.5 py-0.5 rounded capitalize transition-colors ${
                  colormap === theme
                    ? 'bg-[#252925] text-[#F7F5EF] font-bold'
                    : 'text-[#252925]/70 hover:bg-[#9CAF88]/20'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Left SVG Y-Axis + Canvas Plot + Right Colorbar */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Left Y-Axis: Always crisp vector SVG with fixed font size */}
        <div style={{ width: `${yAxisWidth}px`, height: `${plotHeight}px` }} className="shrink-0 relative">
          <svg className="w-full h-full overflow-visible pointer-events-none">
            {yTicks.map((t, idx) => (
              <g key={idx}>
                {/* Horizontal tick mark line */}
                <line
                  x1={yAxisWidth - 5}
                  y1={t.y}
                  x2={yAxisWidth}
                  y2={t.y}
                  stroke="#252925"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                {/* Crisp SVG text, unaffected by scaling */}
                <text
                  x={yAxisWidth - 7}
                  y={idx === yTicks.length - 1 ? t.y + 6 : idx === 0 ? t.y - 2 : t.y}
                  textAnchor="end"
                  dominantBaseline={idx === yTicks.length - 1 ? 'hanging' : idx === 0 ? 'alphabetic' : 'middle'}
                  fill="#252925"
                  opacity="0.8"
                  fontSize="9px"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Center: Dynamic Hardware-Accelerated Heatmap Canvas */}
        <div
          style={{ width: `${plotWidth}px`, height: `${plotHeight}px` }}
          className="relative shrink-0 overflow-hidden bg-[#252925]"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
            });
          }}
          onMouseLeave={() => setMousePos(null)}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Interactive Crosshair Lines */}
          {hoverDetails && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <line
                x1={hoverDetails.x}
                y1={0}
                x2={hoverDetails.x}
                y2={plotHeight}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.85"
              />
              <line
                x1={0}
                y1={hoverDetails.y}
                x2={plotWidth}
                y2={hoverDetails.y}
                stroke="#FFFFFF"
                strokeWidth="1"
                strokeDasharray="3 3"
                strokeOpacity="0.85"
              />
            </svg>
          )}

          {/* Floating High-Contrast Hover Tooltip */}
          {hoverDetails && (
            <div
              className="absolute pointer-events-none z-20 px-2.5 py-1.5 rounded-lg bg-[#252925]/95 text-[#F7F5EF] font-mono text-[10px] shadow-lg border border-[#F7F5EF]/20 whitespace-nowrap animate-in fade-in duration-75"
              style={{
                left: Math.min(hoverDetails.x + 12, plotWidth - 170),
                top: Math.max(hoverDetails.y - 42, 6),
              }}
            >
              <div className="flex items-center gap-2">
                <span>{hoverDetails.timeStr}</span>
                <span className="text-[#9CAF88] font-bold">{hoverDetails.freqStr}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-[#F7F5EF]/80 mt-0.5">
                <span>Power:</span>
                <span className="text-[#E8412C] font-bold">{hoverDetails.value.toFixed(2)} dB</span>
                <span>({hoverDetails.pct.toFixed(0)}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Scientific Power Colorbar (Scale in dB) */}
        <div
          style={{ width: `${colorbarWidth}px`, height: `${plotHeight}px` }}
          className="shrink-0 flex items-center justify-center pl-1.5"
        >
          <div className="relative h-[90%] w-3 rounded border border-[#252925]/30 overflow-hidden shadow-2xs">
            <div
              className="w-full h-full"
              style={{ background: colorbarGradient }}
            />
          </div>
          {/* Colorbar Scale Ticks */}
          <div className="h-[90%] flex flex-col justify-between pl-1 text-[8px] text-[#252925]/70 font-mono">
            <span>{maxVal > 0 ? `+${maxVal.toFixed(0)}` : maxVal.toFixed(0)}</span>
            <span>{((maxVal + minVal) / 2).toFixed(0)}</span>
            <span>{minVal.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: X-Axis Time Ticks (SVG Vector) */}
      <div style={{ height: `${xAxisHeight}px` }} className="relative w-full flex shrink-0">
        <div style={{ width: `${yAxisWidth}px` }} className="shrink-0" />
        <div style={{ width: `${plotWidth}px` }} className="relative h-full shrink-0">
          <svg className="w-full h-full overflow-visible pointer-events-none">
            {xTicks.map((t, idx) => (
              <g key={idx}>
                {/* Vertical tick mark line */}
                <line
                  x1={t.x}
                  y1={0}
                  x2={t.x}
                  y2={4}
                  stroke="#252925"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                {/* Crisp SVG text, unaffected by scaling */}
                <text
                  x={t.x}
                  y={13}
                  textAnchor={idx === 0 ? 'start' : idx === xTicks.length - 1 ? 'end' : 'middle'}
                  dominantBaseline="middle"
                  fill="#252925"
                  opacity="0.8"
                  fontSize="9px"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div style={{ width: `${colorbarWidth}px` }} className="shrink-0" />
      </div>
    </div>
  );
};

export default SpectrogramHeatmap2D;
