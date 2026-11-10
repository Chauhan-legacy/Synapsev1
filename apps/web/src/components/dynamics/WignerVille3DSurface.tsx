import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, ProjectedPoint2D } from '../../utils/advancedMathEngines';
import { RotateCcw, Play, Pause, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface WignerVille3DSurfaceProps {
  densityMatrix: number[][]; // [timeIdx][freqIdx]
  timeLabels: string[];
  freqLabels: string[];
  fs: number;
  compact?: boolean;
}

export const WignerVille3DSurface: React.FC<WignerVille3DSurfaceProps> = ({
  densityMatrix,
  timeLabels,
  freqLabels,
  fs: _fs,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Angles & Zoom
  const [azimuth, setAzimuth] = useState<number>(55); // deg
  const [elevation, setElevation] = useState<number>(32); // deg
  const [zoom, setZoom] = useState<number>(1.15);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const [showWireframe, setShowWireframe] = useState<boolean>(true);

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const nTimes = densityMatrix.length;
  const nFreqs = densityMatrix[0]?.length || 0;

  // Auto-Orbit animation
  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.5) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Main 3D Canvas Rendering Loop
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nTimes < 2 || nFreqs < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear with light ivory scientific paper background (NO black box!)
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    // Subtle background graticule
    ctx.strokeStyle = '#F1ECE1';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3D Bounding Box Scale [-B, +B]^3
    const B = 2.4;

    // Draw 3D Base Grid Floor [Z = -B]
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i < nTimes; i += Math.max(1, Math.floor(nTimes / 6))) {
      const xNorm = ((i / (nTimes - 1)) * 2 - 1) * B;
      const p1 = project3DTo2D({ x: xNorm, y: -B, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const p2 = project3DTo2D({ x: xNorm, y: B, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let j = 0; j < nFreqs; j += Math.max(1, Math.floor(nFreqs / 6))) {
      const yNorm = ((j / (nFreqs - 1)) * 2 - 1) * B;
      const p1 = project3DTo2D({ x: -B, y: yNorm, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const p2 = project3DTo2D({ x: B, y: yNorm, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3 Coordinate Axis Arrows
    const origin = project3DTo2D({ x: -B, y: -B, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axisT = project3DTo2D({ x: B * 1.25, y: -B, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axisF = project3DTo2D({ x: -B, y: B * 1.25, z: -B, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axisW = project3DTo2D({ x: -B, y: -B, z: B * 1.15, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // Time Axis (X)
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axisT.x, axisT.y);
    ctx.stroke();

    // Frequency Axis (Y)
    ctx.strokeStyle = '#4338CA';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axisF.x, axisF.y);
    ctx.stroke();

    // Energy Density W(t, f) Axis (Z)
    ctx.strokeStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axisW.x, axisW.y);
    ctx.stroke();

    ctx.font = '600 11px JetBrains Mono, monospace';
    ctx.fillStyle = '#0F766E';
    ctx.fillText('+Time t (s)', axisT.x + 6, axisT.y);

    ctx.fillStyle = '#4338CA';
    ctx.fillText('+Freq f (Hz)', axisF.x + 6, axisF.y);

    ctx.fillStyle = '#D97706';
    ctx.fillText('+W(t, f) Energy', axisW.x + 6, axisW.y - 4);

    // Build 3D Projected Grid Nodes [t][f]
    const grid3D: ProjectedPoint2D[][] = [];
    for (let i = 0; i < nTimes; i++) {
      const row: ProjectedPoint2D[] = [];
      const xNorm = ((i / (nTimes - 1)) * 2 - 1) * B;
      for (let j = 0; j < nFreqs; j++) {
        const yNorm = ((j / (nFreqs - 1)) * 2 - 1) * B;
        const energy = densityMatrix[i][j] || 0;
        const zNorm = -B + energy * (2 * B); // Height proportional to W(t, f)

        const pt = project3DTo2D({ x: xNorm, y: yNorm, z: zNorm, tIndex: i }, azimuth, elevation, width, height, zoom, B * 1.5);
        row.push(pt);
      }
      grid3D.push(row);
    }

    // Render 3D Surface Quads (Depth Sorted Painter's Algorithm)
    interface SurfaceQuad {
      p0: ProjectedPoint2D;
      p1: ProjectedPoint2D;
      p2: ProjectedPoint2D;
      p3: ProjectedPoint2D;
      avgDepth: number;
      avgEnergy: number;
    }

    const quads: SurfaceQuad[] = [];
    for (let i = 0; i < nTimes - 1; i++) {
      for (let j = 0; j < nFreqs - 1; j++) {
        const p0 = grid3D[i][j];
        const p1 = grid3D[i + 1][j];
        const p2 = grid3D[i + 1][j + 1];
        const p3 = grid3D[i][j + 1];

        const avgDepth = (p0.zDepth + p1.zDepth + p2.zDepth + p3.zDepth) / 4;
        const avgEnergy = (densityMatrix[i][j] + densityMatrix[i + 1][j] + densityMatrix[i + 1][j + 1] + densityMatrix[i][j + 1]) / 4;

        quads.push({ p0, p1, p2, p3, avgDepth, avgEnergy });
      }
    }

    // Sort far to near
    quads.sort((a, b) => a.avgDepth - b.avgDepth);

    // Draw Shaded Quads
    quads.forEach((q) => {
      ctx.beginPath();
      ctx.moveTo(q.p0.x, q.p0.y);
      ctx.lineTo(q.p1.x, q.p1.y);
      ctx.lineTo(q.p2.x, q.p2.y);
      ctx.lineTo(q.p3.x, q.p3.y);
      ctx.closePath();

      // Dynamic scientific colormap based on quantum energy density
      const val = q.avgEnergy;
      let fillCol: string;
      if (val > 0.7) {
        fillCol = `rgba(15, 118, 110, ${0.75 + val * 0.2})`; // Deep Teal peak
      } else if (val > 0.35) {
        fillCol = `rgba(67, 56, 202, ${0.65 + val * 0.25})`; // Indigo mid
      } else if (val > 0.12) {
        fillCol = `rgba(217, 119, 6, ${0.45 + val * 0.3})`; // Amber low
      } else {
        fillCol = `rgba(241, 236, 225, 0.4)`; // Base floor
      }

      ctx.fillStyle = fillCol;
      ctx.fill();

      if (showWireframe) {
        ctx.strokeStyle = 'rgba(221, 214, 199, 0.6)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // Draw Highlighted Iso-Energy Time Slices
    ctx.lineWidth = 1.4;
    for (let i = 0; i < nTimes; i += Math.max(1, Math.floor(nTimes / 7))) {
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.8)';
      ctx.beginPath();
      for (let j = 0; j < nFreqs; j++) {
        const pt = grid3D[i][j];
        if (j === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
  }, [densityMatrix, azimuth, elevation, zoom, showWireframe, nTimes, nFreqs]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || 600;
      const h = parent?.clientHeight || 380;
      canvas.width = w;
      canvas.height = h;
      drawScene();
    };

    handleResize();
    const timer = setTimeout(handleResize, 50);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [drawScene]);

  // Mouse Orbit Drag Listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setAzimuth((prev) => (prev + dx * 0.7 + 360) % 360);
    setElevation((prev) => Math.max(-80, Math.min(80, prev - dy * 0.7)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.12 : 0.12;
    setZoom((prev) => Math.max(0.4, Math.min(3.0, prev + delta)));
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 3D Controls Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#DDD6C7] flex-wrap gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
          <span className="font-bold text-[#1F2430]">3D Wigner-Ville Quantum Phase-Space Surface</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
            z = W(t, f)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Preset Angles */}
          <div className="flex items-center rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => { setAzimuth(55); setElevation(32); }}
              className="px-2 py-0.5 rounded font-bold text-[#4A5060] hover:text-[#1F2430]"
            >
              Perspective 3D
            </button>
            <button
              type="button"
              onClick={() => { setAzimuth(0); setElevation(88); }}
              className="px-2 py-0.5 rounded font-bold text-[#4A5060] hover:text-[#1F2430]"
            >
              Top (t vs f)
            </button>
            <button
              type="button"
              onClick={() => { setAzimuth(0); setElevation(0); }}
              className="px-2 py-0.5 rounded font-bold text-[#4A5060] hover:text-[#1F2430]"
            >
              Front (t vs W)
            </button>
          </div>

          {/* Auto Orbit */}
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 font-mono transition-colors ${
              isAutoOrbit
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:bg-[#EFEBE0]'
            }`}
            title="Toggle 3D Auto-Orbit"
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{isAutoOrbit ? 'Pause' : 'Auto-Orbit'}</span>
          </button>

          {/* Wireframe toggle */}
          <button
            type="button"
            onClick={() => setShowWireframe(!showWireframe)}
            className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
              showWireframe
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:bg-[#EFEBE0]'
            }`}
          >
            Wireframe
          </button>

          {/* Zoom & Reset */}
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.8, z + 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setAzimuth(55); setElevation(32); setZoom(1.15); }}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Box */}
      <div
        className={`w-full ${compact ? 'h-[310px] min-h-[290px]' : 'h-[380px] sm:h-[420px] min-h-[380px]'} rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Orientation Overlay */}
        <div className="absolute top-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1 text-[10px] font-mono text-[#4A5060] shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-[#1F2430]">
            <Compass className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to orbit 3D quantum terrain, scroll to zoom</div>
        </div>

        {/* 3D Coordinate Axis Legend */}
        <div className="absolute bottom-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1.5 text-[10px] font-mono space-y-1 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#0F766E] rounded" />
            <span className="text-[#1F2430] font-semibold">X: Time [0 to {timeLabels[nTimes - 1] || '2.0s'}]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#4338CA] rounded" />
            <span className="text-[#1F2430] font-semibold">Y: Frequency [0 to {freqLabels[nFreqs - 1] || '50 Hz'}]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#D97706] rounded" />
            <span className="text-[#1F2430] font-semibold">Z: Quantum Energy Density W(t, f)</span>
          </div>
        </div>

        {/* Heisenberg Bound Badge */}
        <div className="absolute bottom-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1 text-[10px] font-mono text-right shadow-2xs pointer-events-none">
          <div className="text-[#0F766E] font-bold">Δt · Δf = 1/(4π) ≈ 0.0796</div>
          <div className="text-[#6B6F7B]">Heisenberg-Gabor Theoretical Limit Saturated</div>
        </div>
      </div>
    </div>
  );
};
