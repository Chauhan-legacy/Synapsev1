import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass } from 'lucide-react';

export const Seismic3DEarthRaytracer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(30);
  const [elevation, setElevation] = useState<number>(20);
  const [zoom, setZoom] = useState<number>(1.25);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [activeRayType, setActiveRayType] = useState<'p_wave' | 's_wave' | 'both'>('both');

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.4) % 360);
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
    const rEarth = 1.4; // 6371 km
    const rCore = 0.76; // 3480 km (Core-Mantle Boundary)
    const rInner = 0.27; // 1221 km (Inner Solid Core)

    // 1. Draw Concentric 3D Spheres (Crust, Liquid Outer Core, Solid Inner Core)
    const ringPts = 32;

    // Earth Surface Ring (Crust)
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let k = 0; k <= ringPts; k++) {
      const th = (k / ringPts) * Math.PI * 2;
      const p = project3DTo2D({ x: rEarth * Math.cos(th), y: rEarth * Math.sin(th), z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Core-Mantle Boundary (CMB at 2891 km depth)
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let k = 0; k <= ringPts; k++) {
      const th = (k / ringPts) * Math.PI * 2;
      const p = project3DTo2D({ x: rCore * Math.cos(th), y: rCore * Math.sin(th), z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid Inner Core (1221 km)
    ctx.fillStyle = 'rgba(67, 56, 202, 0.2)';
    ctx.strokeStyle = '#4338CA';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 0; k <= ringPts; k++) {
      const th = (k / ringPts) * Math.PI * 2;
      const p = project3DTo2D({ x: rInner * Math.cos(th), y: rInner * Math.sin(th), z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Earthquake Hypocenter at North Pole (Theta = 0, R = rEarth)
    const hypo = project3DTo2D({ x: 0, y: rEarth, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.arc(hypo.x, hypo.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // 3. Curved Seismic Raypaths
    // P-Waves (Compressional): Can penetrate the liquid outer core with refraction (PKP rays)
    if (activeRayType === 'p_wave' || activeRayType === 'both') {
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 1.4;
      const numRays = 14;
      for (let i = 1; i < numRays; i++) {
        const takeOff = (i / numRays) * Math.PI * 0.9;
        const rayPts: Point3D[] = [];
        for (let s = 0; s <= 20; s++) {
          const frac = s / 20;
          // Refracted curved path through PREM velocity gradient
          const r = rEarth - Math.sin(frac * Math.PI) * (0.4 + (i / numRays) * 0.85);
          const ang = Math.PI / 2 - takeOff * frac * 1.4;
          rayPts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0, tIndex: s });
        }
        const projRay = rayPts.map((p) => project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5));
        ctx.beginPath();
        projRay.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    }

    // S-Waves (Shear): Striking liquid outer core reflect or stop! Shadow zone from 104 deg to 140 deg!
    if (activeRayType === 's_wave' || activeRayType === 'both') {
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.4;
      const numSRays = 8;
      for (let i = 1; i <= numSRays; i++) {
        const takeOff = (i / numSRays) * (Math.PI * 0.42); // shallower angles only
        const rayPts: Point3D[] = [];
        for (let s = 0; s <= 15; s++) {
          const frac = s / 15;
          const r = rEarth - Math.sin(frac * Math.PI) * 0.55;
          const ang = Math.PI / 2 - takeOff * frac * 1.8;
          rayPts.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), z: 0, tIndex: s });
        }
        const projRay = rayPts.map((p) => project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5));
        ctx.beginPath();
        projRay.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
    }

    // S-Wave Shadow Zone Arc indicator (104 deg to 140 deg)
    ctx.strokeStyle = 'rgba(192, 57, 43, 0.4)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let deg = 104; deg <= 140; deg += 2) {
      const rad = Math.PI / 2 - (deg * Math.PI) / 180;
      const p = project3DTo2D({ x: (rEarth + 0.08) * Math.cos(rad), y: (rEarth + 0.08) * Math.sin(rad), z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (deg === 104) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Annotations
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Hypocenter Focus (M7.8)', hypo.x + 10, hypo.y);
    ctx.fillText('Core-Mantle Boundary (CMB 2,891 km)', hypo.x - 120, hypo.y + 110);

  }, [azimuth, elevation, zoom, activeRayType]);

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              isAutoOrbit ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>Auto-Orbit Earth</span>
          </button>
          <div className="flex items-center gap-1 border border-[#DDD6C7] rounded bg-[#FFFFFF] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveRayType('both')}
              className={`px-2 py-0.5 rounded font-bold ${
                activeRayType === 'both' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060]'
              }`}
            >
              All Body Waves
            </button>
            <button
              type="button"
              onClick={() => setActiveRayType('p_wave')}
              className={`px-2 py-0.5 rounded font-bold ${
                activeRayType === 'p_wave' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060]'
              }`}
            >
              P-Waves (PKP)
            </button>
            <button
              type="button"
              onClick={() => setActiveRayType('s_wave')}
              className={`px-2 py-0.5 rounded font-bold ${
                activeRayType === 's_wave' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060]'
              }`}
            >
              S-Wave Shadow
            </button>
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
            onClick={() => { setAzimuth(30); setElevation(20); setZoom(1.25); }}
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
          <div>Drag to rotate Earth interior PREM seismic raytracer</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">S-Wave Core Shadow Zone:</span>
            <span className="font-bold text-[#C0392B]">104° to 140° (v_s = 0 in Liquid Outer Core)</span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            PREM Seismology: T(p) = 2 ∫ r dr / [v(r) √(r² - p² v²)]
          </div>
        </div>
      </div>
    </div>
  );
};
