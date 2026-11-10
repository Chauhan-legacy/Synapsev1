import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { RotateCcw, Play, Pause, ZoomIn, ZoomOut, Compass, Layers } from 'lucide-react';

interface Hilbert3DHelixProps {
  signal: number[];
  envelope: number[];
  fs: number;
}

export const Hilbert3DHelix: React.FC<Hilbert3DHelixProps> = ({
  signal,
  envelope: _envelope,
  fs: _fs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Angles & Zoom
  const [azimuth, setAzimuth] = useState<number>(45); // deg
  const [elevation, setElevation] = useState<number>(25); // deg
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [showProjections, setShowProjections] = useState<boolean>(true);

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Auto-Orbit animation
  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.6) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Main 3D Canvas Rendering
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || signal.length < 10) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background: Clean ivory paper
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    // Subtle graticule grid
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

    const B = 2.4;
    const n = Math.min(signal.length, 300);

    // Normalize signal and compute Hilbert quadrature approximation
    let mean = 0;
    for (let i = 0; i < n; i++) mean += signal[i];
    mean /= n;

    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += (signal[i] - mean) ** 2;
    const std = Math.sqrt(varSum / n) || 1.0;

    // Generate 3D Helix Points: X = Time, Y = Real x(t), Z = Quadrature H[x(t)]
    const helixPoints: Point3D[] = [];
    for (let i = 0; i < n; i++) {
      const tNorm = ((i / (n - 1)) * 2 - 1) * B * 0.9;
      const realVal = (signal[i] - mean) / (std * 2.2);

      // Hilbert quadrature component
      const quadVal = i > 0 && i < n - 1
        ? (signal[i + 1] - signal[i - 1]) / (std * 2.2)
        : (i === 0 ? (signal[1] - signal[0]) / (std * 2.2) : (signal[n - 1] - signal[n - 2]) / (std * 2.2));

      helixPoints.push({ x: tNorm, y: realVal, z: quadVal, tIndex: i });
    }

    // 1. Draw 3D Time Axis Cylinder along X
    const timeStart = project3DTo2D({ x: -B * 0.95, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const timeEnd = project3DTo2D({ x: B * 0.95, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(timeStart.x, timeStart.y);
    ctx.lineTo(timeEnd.x, timeEnd.y);
    ctx.stroke();

    // 2. Optional 2D Projections (Shadows)
    if (showProjections) {
      // Real Projection on XY Plane Floor (Z = -B * 0.6)
      ctx.strokeStyle = 'rgba(67, 56, 202, 0.25)'; // Indigo shadow
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      helixPoints.forEach((p, idx) => {
        const proj = project3DTo2D({ x: p.x, y: p.y, z: -B * 0.6, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (idx === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.stroke();

      // Quadrature Projection on XZ Wall (Y = B * 0.8)
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)'; // Amber shadow
      ctx.beginPath();
      helixPoints.forEach((p, idx) => {
        const proj = project3DTo2D({ x: p.x, y: B * 0.8, z: p.z, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (idx === 0) ctx.moveTo(proj.x, proj.y);
        else ctx.lineTo(proj.x, proj.y);
      });
      ctx.stroke();
    }

    // 3. Draw 3D Analytic Helix Trajectory z(t) = x(t) + j H[x(t)] in Deep Teal
    const projHelix = helixPoints.map((p) =>
      project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5)
    );

    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    projHelix.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 4. Draw Radial Instantaneous Phasor Vectors every 16 samples
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.35)';
    ctx.lineWidth = 1.0;
    for (let i = 0; i < n; i += 16) {
      const p = helixPoints[i];
      const pCenter = project3DTo2D({ x: p.x, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const pCurve = projHelix[i];
      ctx.beginPath();
      ctx.moveTo(pCenter.x, pCenter.y);
      ctx.lineTo(pCurve.x, pCurve.y);
      ctx.stroke();
    }

    // 5. Draw 3D Coordinate Axis Indicators
    const origin = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axT = project3DTo2D({ x: B * 1.1, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axReal = project3DTo2D({ x: 0, y: B * 0.8, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axQuad = project3DTo2D({ x: 0, y: 0, z: B * 0.8, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axT.x, axT.y);
    ctx.stroke();

    ctx.strokeStyle = '#4338CA';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axReal.x, axReal.y);
    ctx.stroke();

    ctx.strokeStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axQuad.x, axQuad.y);
    ctx.stroke();

  }, [signal, azimuth, elevation, zoom, showProjections]);

  // Redraw on change
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawScene();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawScene]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setAzimuth((prev) => (prev + dx * 0.6) % 360);
    setElevation((prev) => Math.max(-85, Math.min(85, prev - dy * 0.6)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.5, Math.min(3.0, prev + delta)));
  };

  return (
    <div className="space-y-3 font-sans">
      {/* 3D Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              isAutoOrbit ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto-Orbit Helix</span>
          </button>
          <button
            type="button"
            onClick={() => setShowProjections(!showProjections)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              showProjections ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]/30 font-bold' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2D Plane Shadows</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setAzimuth(45); setElevation(25); setZoom(1.2); }}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="w-full h-84 sm:h-96 rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs"
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
          <div>Drag to rotate complex analytic helix, scroll to zoom</div>
        </div>

        {/* 3D Coordinate Axis Legend */}
        <div className="absolute bottom-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1.5 text-[10px] font-mono space-y-1 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#1F2430] rounded" />
            <span className="text-[#1F2430] font-semibold">X: Time Axis (Propagation)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#4338CA] rounded" />
            <span className="text-[#1F2430] font-semibold">Y: Real In-Phase x(t)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#D97706] rounded" />
            <span className="text-[#1F2430] font-semibold">Z: Imaginary Quadrature H[x(t)]</span>
          </div>
        </div>

        {/* Helix Radius Envelope Badge */}
        <div className="absolute bottom-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1 text-[10px] font-mono text-right shadow-2xs pointer-events-none">
          <div className="text-[#0F766E] font-bold">z(t) = x(t) + j H[x(t)] = A(t) e^jφ(t)</div>
          <div className="text-[#6B6F7B]">Helix Radius = Instantaneous Envelope A(t)</div>
        </div>
      </div>
    </div>
  );
};
