import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { RotateCcw, ZoomIn, ZoomOut, Compass, Sun, Flame, Zap } from 'lucide-react';

export const Solar3DFlare: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Controls
  const [azimuth, setAzimuth] = useState<number>(40); // deg
  const [elevation, setElevation] = useState<number>(28); // deg
  const [zoom, setZoom] = useState<number>(1.2);
  const [magneticTwist, setMagneticTwist] = useState<number>(1.0); // alpha factor

  // Flare animation trigger state
  const [isFlaring, setIsFlaring] = useState<boolean>(false);
  const [flareProgress, setFlareProgress] = useState<number>(0); // 0 to 1

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Flare Reconnection Eruption Animation
  useEffect(() => {
    if (!isFlaring) return;
    const interval = setInterval(() => {
      setFlareProgress((prev) => {
        const next = prev + 0.025;
        if (next >= 1.0) {
          setIsFlaring(false);
          return 0;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isFlaring]);

  const handleTriggerFlare = () => {
    setIsFlaring(true);
    setFlareProgress(0.01);
  };

  // Main 3D Canvas Rendering
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

    // 1. Draw Solar Photosphere Curved Surface Base at Z = -0.6
    const photoRadius = 2.0;
    const gridRes = 14;
    ctx.strokeStyle = '#E8E2D5';
    ctx.lineWidth = 0.8;
    for (let i = -gridRes; i <= gridRes; i++) {
      const gx = (i / gridRes) * photoRadius;
      ctx.beginPath();
      let started = false;
      for (let j = -gridRes; j <= gridRes; j++) {
        const gy = (j / gridRes) * photoRadius;
        if (gx * gx + gy * gy <= photoRadius * photoRadius) {
          const gz = -0.6 - 0.25 * (gx * gx + gy * gy);
          const p = project3DTo2D({ x: gx, y: gy, z: gz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }
      ctx.stroke();
    }

    // 2. Bipolar Sunspot Magnetic Footpoints: North (+B) and South (-B)
    const footNorth = project3DTo2D({ x: -0.9, y: 0, z: -0.65, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const footSouth = project3DTo2D({ x: 0.9, y: 0, z: -0.65, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // North Footpoint (Deep Teal)
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(footNorth.x, footNorth.y, Math.max(6, 12 * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // South Footpoint (Indigo)
    ctx.fillStyle = '#4338CA';
    ctx.beginPath();
    ctx.arc(footSouth.x, footSouth.y, Math.max(6, 12 * zoom), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Footpoint labels
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('N (+B_z)', footNorth.x - 18, footNorth.y + 18);
    ctx.fillText('S (-B_z)', footSouth.x + 8, footSouth.y + 18);

    // 3. Draw 3D Coronal Loop Magnetic Arcade
    // Semi-toroidal loops spanning from FootNorth to FootSouth with helical twist
    const numLoops = 7;
    const flareHeat = isFlaring ? Math.sin(flareProgress * Math.PI) : 0;

    for (let k = 0; k < numLoops; k++) {
      const loopOffset = (k - (numLoops - 1) / 2) * 0.28;
      const loopHeight = 1.1 + (1 - Math.abs(loopOffset) * 0.5) * 0.4 + flareHeat * 0.5;

      const loopPts: Point3D[] = [];
      const numSteps = 32;

      for (let s = 0; s <= numSteps; s++) {
        const u = (s / numSteps) * Math.PI; // 0 to PI
        const lx = -0.9 * Math.cos(u);
        const lz = -0.65 + loopHeight * Math.sin(u);
        // Helical magnetic twist along flux rope
        const ly = loopOffset + 0.25 * magneticTwist * Math.sin(2 * u);

        loopPts.push({ x: lx, y: ly, z: lz, tIndex: 0 });
      }

      const projLoop = loopPts.map((pt) =>
        project3DTo2D(pt, azimuth, elevation, width, height, zoom, B * 1.5)
      );

      // Loop stroke color: during flare, glow intense amber/red
      if (isFlaring && (k === 3 || k === 2 || k === 4)) {
        ctx.strokeStyle = `rgba(217, 119, 6, ${0.7 + flareHeat * 0.3})`;
        ctx.lineWidth = 2.5 + flareHeat * 2.0;
      } else {
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.55)';
        ctx.lineWidth = 1.4;
      }

      ctx.beginPath();
      projLoop.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // 4. Reconnection Current Sheet X-Point & Plasma Flare Ejection
    const apexPoint = project3DTo2D({ x: 0, y: 0, z: -0.65 + 1.4, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    if (isFlaring) {
      // Expanding Coronal Mass Ejection (CME) shock bubble
      const bubbleR = Math.max(15, (30 + flareProgress * 90) * zoom);
      ctx.strokeStyle = `rgba(192, 57, 43, ${Math.max(0, 1 - flareProgress)})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(apexPoint.x, apexPoint.y - flareProgress * 60, bubbleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Flash core
      const coreGrad = ctx.createRadialGradient(
        apexPoint.x,
        apexPoint.y,
        0,
        apexPoint.x,
        apexPoint.y,
        Math.max(12, 28 * zoom)
      );
      coreGrad.addColorStop(0, '#FFFFFF');
      coreGrad.addColorStop(0.3, '#FDE68A');
      coreGrad.addColorStop(0.7, '#D97706');
      coreGrad.addColorStop(1, 'rgba(192, 57, 43, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(apexPoint.x, apexPoint.y, Math.max(15, 30 * zoom), 0, Math.PI * 2);
      ctx.fill();

      // Flare Annotation
      ctx.fillStyle = '#C0392B';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText('MAGNETIC RECONNECTION: T > 25 MK', apexPoint.x + 18, apexPoint.y - 12);
    } else {
      // Quiescent X-point marker
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(apexPoint.x, apexPoint.y, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#6B6F7B';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('Reconnection X-Point', apexPoint.x + 8, apexPoint.y - 4);
    }

  }, [azimuth, elevation, zoom, magneticTwist, isFlaring, flareProgress]);

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

  // Instantaneous GOES Flare Class
  const currentFlux = isFlaring
    ? 1.5e-4 * Math.sin(flareProgress * Math.PI) + 1.2e-6
    : 1.2e-6;
  const flareClass = currentFlux >= 1e-4 ? 'X1.5 Extreme' : currentFlux >= 1e-5 ? 'M1.2 Moderate' : 'C1.2 Minor';

  return (
    <div className="space-y-3 font-sans">
      {/* 3D Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isFlaring}
            onClick={handleTriggerFlare}
            className={`flex items-center gap-1 px-3 py-1 rounded font-bold transition-colors ${
              isFlaring
                ? 'bg-[#C0392B] text-white animate-pulse cursor-not-allowed'
                : 'bg-[#D97706] text-white hover:bg-[#B45309]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{isFlaring ? 'Erupting Coronal Reconnection...' : 'Trigger Flare Reconnection'}</span>
          </button>
        </div>

        {/* Magnetic Twist Slider & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6F7B]">
            <Zap className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Flux Rope Twist (α):</span>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={magneticTwist}
              onChange={(e) => setMagneticTwist(parseFloat(e.target.value))}
              className="w-20 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-6">{magneticTwist.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1">
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
              onClick={() => { setAzimuth(40); setElevation(28); setZoom(1.2); setMagneticTwist(1.0); }}
              className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
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
          <div>Drag to rotate solar magnetic arcade, scroll to zoom</div>
        </div>

        {/* Live GOES-16 Classification Badge */}
        <div className="absolute top-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-3 py-1.5 text-[10px] font-mono shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-[#D97706]" />
            <span className="text-[#6B6F7B]">NOAA GOES-16 Flux:</span>
          </div>
          <div className="text-sm font-bold text-[#C0392B] mt-0.5">
            {flareClass} ({currentFlux.toExponential(2)} W/m²)
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Plasma Temp:</span>
            <span className="font-bold text-[#1F2430]">{isFlaring ? 'T > 25 MK' : 'T ≈ 3.5 MK'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Biot-Savart Force-Free State:</span>
            <span className="font-bold text-[#0F766E]">∇ × B = α B</span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            NOAA Space Weather Prediction Center
          </div>
        </div>
      </div>
    </div>
  );
};
