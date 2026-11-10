import React, { useRef, useEffect, useState } from 'react';

interface SpectrogramHeatmap2DProps {
  matrix: number[][]; // [timeIndex][freqIndex]
  timeLabels: string[];
  freqLabels: string[];
  isWavelet?: boolean;
}

export const SpectrogramHeatmap2D: React.FC<SpectrogramHeatmap2DProps> = ({
  matrix,
  timeLabels,
  freqLabels,
  isWavelet = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    time: string;
    freq: string;
    power: number;
  } | null>(null);

  const nTimes = matrix.length;
  const nFreqs = matrix[0]?.length || 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || nTimes === 0 || nFreqs === 0) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 240;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 46;
    const padBottom = 26;
    const padTop = 10;
    const padRight = 14;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Find min and max for normalization
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let t = 0; t < nTimes; t++) {
      for (let f = 0; f < nFreqs; f++) {
        const val = matrix[t][f];
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
    }
    const valRange = maxVal - minVal || 1;

    const cellW = plotW / nTimes;
    const cellH = plotH / nFreqs;

    // Draw Heatmap Cells
    for (let t = 0; t < nTimes; t++) {
      for (let f = 0; f < nFreqs; f++) {
        const norm = Math.max(0, Math.min(1, (matrix[t][f] - minVal) / valRange));
        // Scientific colormap: deep teal -> cyan-teal -> amber -> ruby
        let fill: string;
        if (norm < 0.25) {
          fill = `rgba(15, 118, 110, ${0.08 + norm * 1.2})`;
        } else if (norm < 0.60) {
          fill = `rgba(15, 118, 110, ${0.45 + (norm - 0.25) * 1.1})`;
        } else if (norm < 0.85) {
          fill = `rgba(217, 119, 6, ${0.70 + (norm - 0.60) * 1.1})`;
        } else {
          fill = `rgba(185, 28, 28, ${0.85 + (norm - 0.85) * 1.0})`;
        }

        const x = padLeft + t * cellW;
        // Invert Y so low frequency is at bottom
        const y = padTop + (nFreqs - 1 - f) * cellH;

        ctx.fillStyle = fill;
        ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
      }
    }

    // Axes lines
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    // Axis Labels & Ticks
    ctx.fillStyle = '#6B6F7B';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Y ticks (frequency or scale)
    const nYTicks = Math.min(4, nFreqs);
    for (let i = 0; i < nYTicks; i++) {
      const fIdx = Math.round((i / (nYTicks - 1)) * (nFreqs - 1));
      const y = padTop + (nFreqs - 1 - fIdx) * cellH + cellH / 2;
      ctx.fillText(freqLabels[fIdx] || '', padLeft - 4, y);
    }

    // X ticks (time)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const nXTicks = Math.min(4, nTimes);
    for (let i = 0; i < nXTicks; i++) {
      const tIdx = Math.round((i / (nXTicks - 1)) * (nTimes - 1));
      const x = padLeft + tIdx * cellW + cellW / 2;
      ctx.fillText(timeLabels[tIdx] || '', x, padTop + plotH + 4);
    }

    // Subtitle watermark
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#0F766E';
    ctx.font = '600 9px JetBrains Mono, monospace';
    ctx.fillText(isWavelet ? 'CWT |W(s,τ)|²' : 'STFT |S(t,f)|²', padLeft + plotW - 4, padTop + plotH - 4);
  }, [matrix, timeLabels, freqLabels, isWavelet, nTimes, nFreqs]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || nTimes === 0 || nFreqs === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const padLeft = 46;
    const padBottom = 26;
    const padTop = 10;
    const padRight = 14;

    const plotW = canvas.width - padLeft - padRight;
    const plotH = canvas.height - padTop - padBottom;

    if (
      mouseX >= padLeft &&
      mouseX <= padLeft + plotW &&
      mouseY >= padTop &&
      mouseY <= padTop + plotH
    ) {
      const tFrac = (mouseX - padLeft) / plotW;
      const fFrac = 1 - (mouseY - padTop) / plotH;

      const tIdx = Math.max(0, Math.min(nTimes - 1, Math.floor(tFrac * nTimes)));
      const fIdx = Math.max(0, Math.min(nFreqs - 1, Math.floor(fFrac * nFreqs)));

      setHoverInfo({
        x: mouseX,
        y: mouseY,
        time: timeLabels[tIdx] || `${(tFrac * 10).toFixed(1)}s`,
        freq: freqLabels[fIdx] || `${(fFrac * 50).toFixed(0)} Hz`,
        power: matrix[tIdx]?.[fIdx] || 0,
      });
    } else {
      setHoverInfo(null);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden rounded-md border border-[#DDD6C7] bg-[#FFFDF9]">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="w-full h-full block cursor-crosshair"
      />
      {hoverInfo && (
        <div
          className="absolute pointer-events-none z-10 px-2 py-1 rounded bg-[#1F2430]/90 text-white font-mono text-[10px] shadow-sm whitespace-nowrap"
          style={{
            left: Math.min(hoverInfo.x + 12, (canvasRef.current?.width || 300) - 130),
            top: Math.max(hoverInfo.y - 28, 6),
          }}
        >
          <span>{hoverInfo.time}</span> • <span>{hoverInfo.freq}</span> • <span className="text-[#D97706] font-bold">{hoverInfo.power.toFixed(2)} dB</span>
        </div>
      )}
    </div>
  );
};

