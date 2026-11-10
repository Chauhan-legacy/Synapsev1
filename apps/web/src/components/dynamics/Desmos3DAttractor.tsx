import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  computeTakens3D,
  project3DTo2D,
  Point3D,
  ProjectedPoint2D,
} from '../../utils/advancedMathEngines';
import { RotateCcw, Play, Pause, ZoomIn, ZoomOut, Compass, Box } from 'lucide-react';

interface Desmos3DAttractorProps {
  signal: number[];
  delay: number;
  onDelayChange?: (newDelay: number) => void;
  title?: string;
}

export const Desmos3DAttractor: React.FC<Desmos3DAttractorProps> = ({
  signal,
  delay,
  onDelayChange,
  title = '3D Phase-Space Attractor Manifold',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Angles and Zoom
  const [azimuth, setAzimuth] = useState<number>(45); // deg
  const [elevation, setElevation] = useState<number>(25); // deg
  const [zoom, setZoom] = useState<number>(1.1);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const [showPoincareSection, setShowPoincareSection] = useState<boolean>(false);
  const [showBoundingBox, setShowBoundingBox] = useState<boolean>(true);

  // Mouse drag state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute 3D delay coordinates
  const { points, bounds } = computeTakens3D(signal, delay, 800);

  // Auto-Orbit animation
  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.6) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Main Canvas Render Loop
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    const gridStep = 40;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 1. Draw 3D Wireframe Bounding Box [-B, +B]^3
    const B = 2.4;
    const boxVertices: Point3D[] = [
      { x: -B, y: -B, z: -B, tIndex: 0 },
      { x: B, y: -B, z: -B, tIndex: 0 },
      { x: B, y: B, z: -B, tIndex: 0 },
      { x: -B, y: B, z: -B, tIndex: 0 },
      { x: -B, y: -B, z: B, tIndex: 0 },
      { x: B, y: -B, z: B, tIndex: 0 },
      { x: B, y: B, z: B, tIndex: 0 },
      { x: -B, y: B, z: B, tIndex: 0 },
    ];

    const projBox: ProjectedPoint2D[] = boxVertices.map((v) =>
      project3DTo2D(v, azimuth, elevation, width, height, zoom, B * 1.5)
    );

    if (showBoundingBox) {
      // 12 edges of the 3D bounding box
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Bottom
        [4, 5], [5, 6], [6, 7], [7, 4], // Top
        [0, 4], [1, 5], [2, 6], [3, 7], // Vertical struts
      ];

      ctx.strokeStyle = '#DDD6C7';
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);

      edges.forEach(([u, v]) => {
        ctx.beginPath();
        ctx.moveTo(projBox[u].x, projBox[u].y);
        ctx.lineTo(projBox[v].x, projBox[v].y);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Draw 3 Principal Coordinate Axes passing through (0,0,0)
      const origin = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const axisX = project3DTo2D({ x: B * 1.25, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const axisY = project3DTo2D({ x: 0, y: B * 1.25, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const axisZ = project3DTo2D({ x: 0, y: 0, z: B * 1.25, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

      // X Axis (Lead) - Deep Teal
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisX.x, axisX.y);
      ctx.stroke();

      // Y Axis (Lag 1) - Indigo
      ctx.strokeStyle = '#4338CA';
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisY.x, axisY.y);
      ctx.stroke();

      // Z Axis (Lag 2) - Amber
      ctx.strokeStyle = '#D97706';
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(axisZ.x, axisZ.y);
      ctx.stroke();

      // Coordinate Labels
      ctx.font = '600 11px JetBrains Mono, monospace';
      ctx.fillStyle = '#0F766E';
      ctx.fillText(`+X : x(t)`, axisX.x + 6, axisX.y - 2);

      ctx.fillStyle = '#4338CA';
      ctx.fillText(`+Y : x(t+${delay}τ)`, axisY.x + 6, axisY.y - 2);

      ctx.fillStyle = '#D97706';
      ctx.fillText(`+Z : x(t+${2 * delay}τ)`, axisZ.x + 6, axisZ.y - 2);
    }

    // 2. Poincaré Section Cut Plane (Z = 0)
    if (showPoincareSection) {
      const pPlaneCorners: Point3D[] = [
        { x: -B, y: -B, z: 0, tIndex: 0 },
        { x: B, y: -B, z: 0, tIndex: 0 },
        { x: B, y: B, z: 0, tIndex: 0 },
        { x: -B, y: B, z: 0, tIndex: 0 },
      ];
      const pProj = pPlaneCorners.map((c) =>
        project3DTo2D(c, azimuth, elevation, width, height, zoom, B * 1.5)
      );

      ctx.fillStyle = 'rgba(15, 118, 110, 0.08)';
      ctx.beginPath();
      ctx.moveTo(pProj[0].x, pProj[0].y);
      pProj.forEach((p, idx) => {
        if (idx > 0) ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(15, 118, 110, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#0F766E';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('Poincaré Section Plane [z = 0]', pProj[2].x - 170, pProj[2].y - 6);
    }

    // 3. Project 3D Attractor Trajectory Points
    if (points.length < 2) return;

    const projected: ProjectedPoint2D[] = points.map((p) =>
      project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5)
    );

    // Draw Continuous 3D Orbit Polyline with dynamic depth color gradient
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const nPts = projected.length;
    for (let i = 0; i < nPts - 1; i++) {
      const p1 = projected[i];
      const p2 = projected[i + 1];

      // Depth-based color shading (deeper points are slightly darker / cooler)
      const progress = i / nPts;
      const depthFactor = Math.max(0.4, Math.min(1.0, (p1.zDepth + B) / (2 * B)));

      // Scientific gradient: Deep Teal (#0F766E) -> Indigo (#4338CA) -> Coral (#D97706)
      let strokeColor: string;
      if (progress < 0.5) {
        strokeColor = `rgba(15, 118, 110, ${0.4 + 0.55 * depthFactor})`;
      } else {
        strokeColor = `rgba(67, 56, 202, ${0.4 + 0.55 * depthFactor})`;
      }

      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // If Poincaré mode is active, mark piercings through z = 0
      if (showPoincareSection && i > 0) {
        const zPrev = points[i - 1].z;
        const zCurr = points[i].z;
        if ((zPrev < 0 && zCurr >= 0) || (zPrev >= 0 && zCurr < 0)) {
          ctx.fillStyle = '#D97706';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 3.2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // 4. Highlight Selected / Current Point
    const lastP = projected[projected.length - 1];
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(lastP.x, lastP.y, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [points, azimuth, elevation, zoom, showBoundingBox, showPoincareSection, delay]);

  // Redraw when parameters or window change
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        drawScene();
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

    setAzimuth((prev) => (prev + dx * 0.75 + 360) % 360);
    setElevation((prev) => Math.max(-85, Math.min(85, prev - dy * 0.75)));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(0.4, Math.min(3.2, prev + delta)));
  };

  // Preset Angle Handlers
  const setPresetAngle = (az: number, el: number) => {
    setAzimuth(az);
    setElevation(el);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-lg p-4 space-y-3 shadow-2xs">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#DDD6C7]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#1F2430] font-sans">{title}</h3>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/20">
              Desmos 3D Engine
            </span>
          </div>
          <p className="text-[11px] font-mono text-[#6B6F7B]">
            Takens coordinates: [x(t), x(t+{delay}τ), x(t+{2 * delay}τ)] • {points.length} state trajectory vectors
          </p>
        </div>

        {/* 3D Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Preset Camera Views */}
          <div className="flex items-center rounded border border-[#DDD6C7] bg-[#F6F3EC] p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setPresetAngle(45, 25)}
              className={`px-2 py-0.5 rounded ${
                azimuth === 45 && elevation === 25 ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
              title="Isometric 3D Perspective"
            >
              Iso 3D
            </button>
            <button
              type="button"
              onClick={() => setPresetAngle(0, 0)}
              className={`px-2 py-0.5 rounded ${
                azimuth === 0 && elevation === 0 ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
              title="Front View: x(t) vs x(t+τ)"
            >
              Front XY
            </button>
            <button
              type="button"
              onClick={() => setPresetAngle(0, 89)}
              className={`px-2 py-0.5 rounded ${
                azimuth === 0 && elevation === 89 ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
              title="Top View: x(t) vs x(t+2τ)"
            >
              Top XZ
            </button>
            <button
              type="button"
              onClick={() => setPresetAngle(90, 0)}
              className={`px-2 py-0.5 rounded ${
                azimuth === 90 && elevation === 0 ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:text-[#1F2430]'
              }`}
              title="Side View: x(t+τ) vs x(t+2τ)"
            >
              Side YZ
            </button>
          </div>

          {/* Auto Orbit Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 font-mono transition-colors ${
              isAutoOrbit
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:bg-[#EFEBE0]'
            }`}
            title="Toggle Continuous 3D Auto-Orbit"
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{isAutoOrbit ? 'Pause' : 'Auto-Orbit'}</span>
          </button>

          {/* Poincaré Section Toggle */}
          <button
            type="button"
            onClick={() => setShowPoincareSection(!showPoincareSection)}
            className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
              showPoincareSection
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:bg-[#EFEBE0]'
            }`}
            title="Toggle Poincaré Cut Plane z=0"
          >
            Poincaré Cut
          </button>

          {/* Wireframe Box Toggle */}
          <button
            type="button"
            onClick={() => setShowBoundingBox(!showBoundingBox)}
            className={`px-2 py-1 rounded border text-[10px] font-mono transition-colors ${
              showBoundingBox
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060] hover:bg-[#EFEBE0]'
            }`}
            title="Toggle 3D Coordinate Bounding Box"
          >
            <Box className="w-3 h-3 inline mr-1" />
            Box
          </button>

          {/* Zoom Controls */}
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.min(3.0, prev + 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(0.4, prev - 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAzimuth(45);
              setElevation(25);
              setZoom(1.1);
            }}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        className="w-full h-84 sm:h-96 rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Orientation Compass Overlay */}
        <div className="absolute top-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2 py-1 text-[10px] font-mono text-[#4A5060] space-y-0.5 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-[#1F2430]">
            <Compass className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Scale: {zoom.toFixed(2)}x • Drag to rotate, scroll to zoom</div>
        </div>

        {/* 3D Coordinate Legend Overlay */}
        <div className="absolute bottom-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1.5 text-[10px] font-mono space-y-1 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#0F766E] rounded" />
            <span className="text-[#1F2430] font-semibold">X: x(t) [Leading]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#4338CA] rounded" />
            <span className="text-[#1F2430] font-semibold">Y: x(t+{delay}τ) [1st Delay]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-1 bg-[#D97706] rounded" />
            <span className="text-[#1F2430] font-semibold">Z: x(t+{2 * delay}τ) [2nd Delay]</span>
          </div>
        </div>

        {/* Physical Scale Description */}
        <div className="absolute bottom-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2 py-1 text-[10px] font-mono text-[#6B6F7B] shadow-2xs pointer-events-none text-right">
          <div>Z-Score Norm: μ = {bounds.min.toFixed(2)}σ to {bounds.max.toFixed(2)}σ</div>
          <div className="text-[#0F766E] font-semibold">Takens Embedding Theorem: m ≥ 2d + 1</div>
        </div>
      </div>

      {/* Delay Embedding Slider */}
      {onDelayChange && (
        <div className="flex items-center justify-between p-2.5 rounded bg-[#F6F3EC] border border-[#DDD6C7] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1F2430]">Embedding Delay Lag (τ):</span>
            <span className="px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#DDD6C7] font-bold text-[#0F766E]">
              {delay} samples
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#6B6F7B]">1</span>
            <input
              type="range"
              min="1"
              max="35"
              value={delay}
              onChange={(e) => onDelayChange(Number(e.target.value))}
              className="w-36 sm:w-48 cursor-pointer accent-[#0F766E]"
            />
            <span className="text-[10px] text-[#6B6F7B]">35</span>
          </div>
        </div>
      )}
    </div>
  );
};
