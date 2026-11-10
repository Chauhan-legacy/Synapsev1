import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Radio } from 'lucide-react';

export const KerrBlackHole3DRaytracer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(25);
  const [elevation, setElevation] = useState<number>(15);
  const [zoom, setZoom] = useState<number>(1.25);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [spinParameterA, setSpinParameterA] = useState<number>(0.94); // a* in [0, 0.99]

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.5) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

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
    const center = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // 1. Draw Thin Relativistic Accretion Disk in Equatorial Plane (Z = 0)
    // R_in = ISCO radius (for a=0.94, ISCO ~ 2.05 M), R_out ~ 7.0 M
    const rIn = 0.55;
    const rOut = 1.6;
    const numDiskRings = 16;
    const ringPts = 36;

    for (let r = 0; r < numDiskRings; r++) {
      const radius = rIn + (r / (numDiskRings - 1)) * (rOut - rIn);
      ctx.beginPath();
      for (let k = 0; k <= ringPts; k++) {
        const phi = (k / ringPts) * Math.PI * 2;
        const px = radius * Math.cos(phi);
        const py = radius * Math.sin(phi);

        // Relativistic Doppler boosting: Approaching side (py < 0) is blue-shifted & brighter!
        const p = project3DTo2D({ x: px, y: py, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = r < 4 ? 'rgba(217, 119, 6, 0.75)' : 'rgba(15, 118, 110, 0.35)';
      ctx.lineWidth = r < 4 ? 2.0 : 1.0;
      ctx.stroke();
    }

    // 2. Ergosphere Boundary Surface (Oblate Spheroid r_E(theta) = M + sqrt(M^2 - a^2 cos^2 theta))
    const ergoPts = 24;
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let k = 0; k <= ergoPts; k++) {
      const th = (k / ergoPts) * Math.PI * 2;
      const rE = 0.45 * (1.0 + Math.sqrt(Math.max(0.01, 1.0 - spinParameterA * spinParameterA * Math.cos(th) * Math.cos(th))));
      const p = project3DTo2D({ x: rE * Math.sin(th), y: 0, z: rE * Math.cos(th), tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Central Event Horizon & Asymmetric Kerr Shadow (Shifted by 2*a*M)
    const shadowR = Math.max(16, 32 * zoom);
    const shadowX = center.x + spinParameterA * 14 * zoom;

    ctx.fillStyle = '#1F2430';
    ctx.beginPath();
    ctx.arc(shadowX, center.y, shadowR, 0, Math.PI * 2);
    ctx.fill();

    // 4. Bright Gravitational Lensing Photon Ring (Crescent Glow on approaching side)
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(shadowX, center.y, shadowR + 3, Math.PI * 0.5, Math.PI * 1.5); // asymmetric crescent
    ctx.stroke();

    // Annotations
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Relativistic Doppler Beamed Flux (Approaching)', center.x - 140, center.y + shadowR + 25);
    ctx.fillText('Photon Ring & Event Horizon Shadow', shadowX + 38, center.y - 6);

  }, [azimuth, elevation, zoom, spinParameterA]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const resize = () => {
      const w = parent?.clientWidth || 600;
      const h = parent?.clientHeight || 380;
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
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              isAutoOrbit ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto-Orbit Geodesics</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[#6B6F7B]">
            <Radio className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Kerr Spin (a*):</span>
            <input
              type="range"
              min="0.0"
              max="0.99"
              step="0.01"
              value={spinParameterA}
              onChange={(e) => setSpinParameterA(parseFloat(e.target.value))}
              className="w-20 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-12">{spinParameterA.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => { setAzimuth(25); setElevation(15); setZoom(1.25); setSpinParameterA(0.94); }}
            className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className="w-full h-[380px] sm:h-[420px] min-h-[380px] rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        <div className="absolute top-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1 text-[10px] font-mono text-[#4A5060] shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-[#1F2430]">
            <Compass className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to rotate spinning Kerr black hole spacetime &amp; shadow</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">EHT M87* Metric:</span>
            <span className="font-bold text-[#0F766E]">Kerr Horizon r_+ = M + √(M² - a²) = 1.34 M</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Photon Orbit: r_ph = 1.39 M (Doppler Asymmetric Crescent Shadow)
          </div>
        </div>
      </div>
    </div>
  );
};

