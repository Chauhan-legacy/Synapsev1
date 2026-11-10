import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Orbit, Activity } from 'lucide-react';

interface Ligo3DSpacetimeProps {
  onIngest?: () => void;
}

export const Ligo3DSpacetime: React.FC<Ligo3DSpacetimeProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Controls
  const [azimuth, setAzimuth] = useState<number>(45); // deg
  const [elevation, setElevation] = useState<number>(35); // deg
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Simulation time parameter t in [-0.35, 0.05] seconds (GW150914 window)
  const [timeSec, setTimeSec] = useState<number>(-0.08);
  const [showLivingstonLag, setShowLivingstonLag] = useState<boolean>(true);

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Continuous physics animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeSec((prev) => {
        const next = prev + 0.002;
        if (next > 0.05) return -0.32; // Loop back to early inspiral
        return next;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Auto-Orbit camera rotation
  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.5) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Render 3D Spacetime Curvature & BBH Inspiral Canvas
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background: Clean ivory paper
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    // Subtle graticule
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

    // Physical Binary Black Hole Orbit Parameters
    // Inspiral separation r(t) shrinks as coalescence approaches
    const tCoalescence = 0.0;
    const timeToMerger = Math.max(0.002, tCoalescence - timeSec);
    const isRingdown = timeSec > 0;

    // Orbital radius: r ~ (t_c - t)^(1/4)
    let orbitRadius = isRingdown ? 0.08 : Math.max(0.18, 0.9 * Math.pow(timeToMerger / 0.35, 0.35));
    // Orbital phase: phi ~ -(t_c - t)^(5/8)
    const orbitFreq = isRingdown ? 250 : Math.min(250, 35 / Math.pow(timeToMerger / 0.35, 0.45));
    const orbitPhase = isRingdown ? (timeSec / 0.004) * Math.PI : (-timeToMerger * orbitFreq * 2 * Math.PI);

    // Position of Black Hole 1 (36 M_sun)
    const m1Ratio = 29 / (36 + 29); // distance from barycenter
    const bh1X = orbitRadius * m1Ratio * Math.cos(orbitPhase);
    const bh1Y = orbitRadius * m1Ratio * Math.sin(orbitPhase);

    // Position of Black Hole 2 (29 M_sun)
    const m2Ratio = 36 / (36 + 29);
    const bh2X = -orbitRadius * m2Ratio * Math.cos(orbitPhase);
    const bh2Y = -orbitRadius * m2Ratio * Math.sin(orbitPhase);

    // Gravitational wave wavelength in simulation units
    const lambdaGW = 0.7;
    const gwAmplitude = isRingdown
      ? 0.35 * Math.exp(-timeSec / 0.008)
      : 0.12 * Math.pow(0.35 / timeToMerger, 0.3);

    // 1. Draw 3D Deformable Spacetime Grid Mesh (25 x 25 resolution)
    const gridDim = 24;
    const step = (2 * B) / gridDim;

    // Precompute 3D vertices
    const meshPoints: Point3D[][] = [];
    for (let i = 0; i <= gridDim; i++) {
      meshPoints[i] = [];
      const gx = -B + i * step;
      for (let j = 0; j <= gridDim; j++) {
        const gy = -B + j * step;

        // Distance to BH1 and BH2
        const d1 = Math.sqrt((gx - bh1X) ** 2 + (gy - bh1Y) ** 2);
        const d2 = Math.sqrt((gx - bh2X) ** 2 + (gy - bh2Y) ** 2);
        const rBary = Math.sqrt(gx * gx + gy * gy);

        // Potential wells: -GM / (r + eps)
        const pot1 = -0.38 / (d1 + 0.22);
        const pot2 = -0.32 / (d2 + 0.22);

        // Outward propagating gravitational quadrupole spiral wave: cos(2*phi - 2*pi*r/lambda)
        const wave = gwAmplitude * Math.cos(2 * orbitPhase - (2 * Math.PI * rBary) / lambdaGW) * Math.exp(-rBary * 0.35);

        const gz = isRingdown
          ? -0.55 / (rBary + 0.25) + wave
          : (pot1 + pot2 + wave);

        meshPoints[i][j] = { x: gx, y: gy, z: gz, tIndex: 0 };
      }
    }

    // Project mesh to 2D
    const projMesh = meshPoints.map((row) =>
      row.map((pt) => project3DTo2D(pt, azimuth, elevation, width, height, zoom, B * 1.5))
    );

    // Draw mesh lines along X
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.8;
    for (let i = 0; i <= gridDim; i++) {
      ctx.beginPath();
      for (let j = 0; j <= gridDim; j++) {
        const p = projMesh[i][j];
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Draw mesh lines along Y
    for (let j = 0; j <= gridDim; j++) {
      ctx.beginPath();
      for (let i = 0; i <= gridDim; i++) {
        const p = projMesh[i][j];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Highlight Gravitational Wave Wavefront Crests in Deep Teal
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.45)';
    ctx.lineWidth = 1.6;
    for (let i = 1; i < gridDim; i++) {
      for (let j = 1; j < gridDim; j++) {
        const pt = meshPoints[i][j];
        if (pt.z > -0.2 && Math.sin(2 * orbitPhase - (2 * Math.PI * Math.sqrt(pt.x ** 2 + pt.y ** 2)) / lambdaGW) > 0.7) {
          const p1 = projMesh[i][j];
          const p2 = projMesh[i + 1][j];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // 2. Render Black Holes
    const pBH1 = project3DTo2D({ x: bh1X, y: bh1Y, z: -0.45, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const pBH2 = project3DTo2D({ x: bh2X, y: bh2Y, z: -0.40, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // BH1 (Primary 36 M_sun)
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(pBH1.x, pBH1.y, Math.max(5, 10 * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accretion / Photon ring glow
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pBH1.x, pBH1.y, Math.max(7, 13 * zoom), 0, Math.PI * 2);
    ctx.stroke();

    // BH2 (Secondary 29 M_sun)
    ctx.fillStyle = '#4338CA';
    ctx.beginPath();
    ctx.arc(pBH2.x, pBH2.y, Math.max(4, 8 * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pBH2.x, pBH2.y, Math.max(6, 11 * zoom), 0, Math.PI * 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('M₁ (36 M☉)', pBH1.x + 12, pBH1.y - 6);
    ctx.fillText('M₂ (29 M☉)', pBH2.x + 10, pBH2.y + 12);

    // 3. Coordinate Axes
    const origin = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axX = project3DTo2D({ x: B * 1.15, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axY = project3DTo2D({ x: 0, y: B * 1.15, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axX.x, axX.y);
    ctx.stroke();

    ctx.strokeStyle = '#4338CA';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axY.x, axY.y);
    ctx.stroke();

  }, [azimuth, elevation, zoom, timeSec]);

  // Canvas redraw on dependencies change
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
      const w = parent.clientWidth || 600;
      const h = parent.clientHeight || 380;
      canvas.width = w;
      canvas.height = h;
      drawScene();
    };

    resize();
    const timer = setTimeout(resize, 50);
    window.addEventListener('resize', resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
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
    setElevation((prev) => Math.max(5, Math.min(85, prev - dy * 0.6)));
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
      {/* 3D Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F766E] text-white font-bold hover:bg-[#0D655E] transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Inspiral' : 'Play Inspiral'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              isAutoOrbit ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>Auto-Orbit</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLivingstonLag(!showLivingstonLag)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              showLivingstonLag ? 'bg-[#E6F4F2] text-[#0F766E] border-[#0F766E]/40' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>6.9 ms Livingston Offset</span>
          </button>
        </div>

        {/* Zoom & Reset */}
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
            onClick={() => { setAzimuth(45); setElevation(35); setZoom(1.2); setTimeSec(-0.08); }}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
            title="Reset Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="w-full h-[380px] sm:h-[420px] min-h-[380px] rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs"
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
          <div>Drag to rotate 3D metric sheet, wheel to zoom</div>
        </div>

        {/* Inspiral Timeline Scrubber */}
        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Epoch:</span>
            <span className="font-bold text-[#1F2430]">
              {(timeSec * 1000).toFixed(0)} ms {timeSec >= 0 ? '(Post-Merger Ringdown)' : '(Inspiral Coalescence)'}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[10px] text-[#6B6F7B]">-350ms</span>
            <input
              type="range"
              min="-0.35"
              max="0.05"
              step="0.002"
              value={timeSec}
              onChange={(e) => setTimeSec(parseFloat(e.target.value))}
              className="w-full accent-[#0F766E] cursor-pointer"
            />
            <span className="text-[10px] text-[#6B6F7B]">+50ms</span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            Gravitational Quadrupole Wave h₊(t, r)
          </div>
        </div>
      </div>
    </div>
  );
};
