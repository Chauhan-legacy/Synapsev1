import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Flame, AlertTriangle } from 'lucide-react';

export const Tokamak3DFusion: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(35);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [isDisrupting, setIsDisrupting] = useState<boolean>(false);
  const [plasmaPhase, setPlasmaPhase] = useState<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.4) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Plasma rotation animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPlasmaPhase((p) => (p + 0.08) % (Math.PI * 2));
    }, 30);
    return () => clearInterval(interval);
  }, []);

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
    const R_major = 1.3;
    const r_minor = 0.5;

    // 1. Draw Toroidal Vacuum Vessel Coils (12 Toroidal Field D-shaped Coils)
    const numCoils = 12;
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([2, 2]);

    for (let i = 0; i < numCoils; i++) {
      const phi = (i / numCoils) * Math.PI * 2;
      const numPts = 20;
      ctx.beginPath();
      for (let j = 0; j <= numPts; j++) {
        const theta = (j / numPts) * Math.PI * 2;
        const x = (R_major + r_minor * 1.25 * Math.cos(theta)) * Math.cos(phi);
        const y = (R_major + r_minor * 1.25 * Math.cos(theta)) * Math.sin(phi);
        const z = r_minor * 1.6 * Math.sin(theta);

        const p = project3DTo2D({ x, y, z, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Draw Confined Fusion Plasma Flux Surfaces (Helical Magnetic Field Lines)
    // q = m / n = 2 safety factor: turns 2 times toroidally per 1 poloidal turn
    const numFieldLines = 10;
    for (let l = 0; l < numFieldLines; l++) {
      const lineOffset = (l / numFieldLines) * Math.PI * 2;
      const pts: Point3D[] = [];
      const steps = 60;

      for (let s = 0; s <= steps; s++) {
        const poloidal = (s / steps) * Math.PI * 4; // 2 poloidal turns
        const toroidal = poloidal * 0.5 + lineOffset + plasmaPhase; // q = 2 helical pitch

        // If disrupting, add m=2 tearing mode magnetic island perturbation
        const islandR = isDisrupting ? r_minor * (1.0 + 0.45 * Math.sin(2 * toroidal - poloidal)) : r_minor;

        const px = (R_major + islandR * Math.cos(poloidal)) * Math.cos(toroidal);
        const py = (R_major + islandR * Math.cos(poloidal)) * Math.sin(toroidal);
        const pz = islandR * 1.2 * Math.sin(poloidal);

        pts.push({ x: px, y: py, z: pz, tIndex: s });
      }

      const proj = pts.map((p) => project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5));

      ctx.strokeStyle = isDisrupting ? 'rgba(192, 57, 43, 0.7)' : 'rgba(15, 118, 110, 0.65)';
      ctx.lineWidth = isDisrupting ? 1.8 : 1.4;
      ctx.beginPath();
      proj.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // 3. Central Solenoid Core Column
    const csTop = project3DTo2D({ x: 0, y: 0, z: 1.1, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const csBot = project3DTo2D({ x: 0, y: 0, z: -1.1, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(csBot.x, csBot.y);
    ctx.lineTo(csTop.x, csTop.y);
    ctx.stroke();

    // 4. Mirnov Magnetic Pick-Up Coils along outer vessel
    const mirnovPts = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    mirnovPts.forEach((phi) => {
      const mp = project3DTo2D({ x: (R_major + r_minor * 1.3) * Math.cos(phi), y: (R_major + r_minor * 1.3) * Math.sin(phi), z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

  }, [azimuth, elevation, zoom, isDisrupting, plasmaPhase]);

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
            <span>Auto-Orbit Torus</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDisrupting(!isDisrupting)}
            className={`flex items-center gap-1 px-3 py-1 rounded font-bold transition-colors ${
              isDisrupting ? 'bg-[#C0392B] text-white animate-pulse' : 'bg-[#D97706] text-white'
            }`}
          >
            {isDisrupting ? <AlertTriangle className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
            <span>{isDisrupting ? 'Triggering MHD Quench' : 'Inject m=2 Tearing Island'}</span>
          </button>
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
            onClick={() => { setAzimuth(45); setElevation(35); setZoom(1.2); setIsDisrupting(false); }}
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
          <div>Drag to rotate DIII-D/ITER Toroidal Tokamak Chamber</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Safety Factor Profile:</span>
            <span className={`font-bold ${isDisrupting ? 'text-[#C0392B]' : 'text-[#0F766E]'}`}>
              {isDisrupting ? 'q = 2.0 Tearing Island Reconnected (Major Disruption)' : 'q(r) > 1.0 (Stable Grad-Shafranov Equilibrium)'}
            </span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Mirnov Coils Pick-Up: V_m = -dΦ/dt (Current Quench Rate dI/dt = -0.55 MA/ms)
          </div>
        </div>
      </div>
    </div>
  );
};

