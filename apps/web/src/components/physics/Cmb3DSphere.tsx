import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Globe } from 'lucide-react';

export const Cmb3DSphere: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(30);
  const [elevation, setElevation] = useState<number>(20);
  const [zoom, setZoom] = useState<number>(1.25);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);

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
    const R = 1.4;

    // Draw 3D Celestial CMB Sphere with Acoustic Temperature Fluctuations
    const latBands = 22;
    const lonBands = 36;

    for (let i = 0; i < latBands; i++) {
      const lat1 = ((i / latBands) - 0.5) * Math.PI;
      const lat2 = (((i + 1) / latBands) - 0.5) * Math.PI;

      for (let j = 0; j < lonBands; j++) {
        const lon1 = (j / lonBands) * 2 * Math.PI;
        const lon2 = ((j + 1) / lonBands) * 2 * Math.PI;

        // Spherical harmonic multipole simulation: Y_lm mix for temperature delta T / T
        const tempFluct =
          Math.sin(3 * lat1) * Math.cos(2 * lon1) * 0.45 +
          Math.sin(7 * lat1) * Math.sin(5 * lon1) * 0.35 +
          Math.sin(12 * lat1) * Math.cos(8 * lon1) * 0.20;

        // Color mapping: warm fluctuations (Amber / Red) vs cold fluctuations (Teal / Blue)
        let fill = '#FFFFFF';
        if (tempFluct > 0.3) fill = 'rgba(217, 119, 6, 0.75)'; // Warm acoustic compression peak
        else if (tempFluct > 0.05) fill = 'rgba(245, 158, 11, 0.45)';
        else if (tempFluct < -0.3) fill = 'rgba(15, 118, 110, 0.75)'; // Cold rarefaction trough
        else if (tempFluct < -0.05) fill = 'rgba(67, 56, 202, 0.45)';
        else fill = 'rgba(238, 234, 224, 0.6)';

        const p1: Point3D = { x: R * Math.cos(lat1) * Math.cos(lon1), y: R * Math.cos(lat1) * Math.sin(lon1), z: R * Math.sin(lat1), tIndex: 0 };
        const p2: Point3D = { x: R * Math.cos(lat1) * Math.cos(lon2), y: R * Math.cos(lat1) * Math.sin(lon2), z: R * Math.sin(lat1), tIndex: 0 };
        const p3: Point3D = { x: R * Math.cos(lat2) * Math.cos(lon2), y: R * Math.cos(lat2) * Math.sin(lon2), z: R * Math.sin(lat2), tIndex: 0 };
        const p4: Point3D = { x: R * Math.cos(lat2) * Math.cos(lon1), y: R * Math.cos(lat2) * Math.sin(lon1), z: R * Math.sin(lat2), tIndex: 0 };

        const pt1 = project3DTo2D(p1, azimuth, elevation, width, height, zoom, B * 1.5);
        const pt2 = project3DTo2D(p2, azimuth, elevation, width, height, zoom, B * 1.5);
        const pt3 = project3DTo2D(p3, azimuth, elevation, width, height, zoom, B * 1.5);
        const pt4 = project3DTo2D(p4, azimuth, elevation, width, height, zoom, B * 1.5);

        // Render back-face culled or faint
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#DDD6C7';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.lineTo(pt3.x, pt3.y);
        ctx.lineTo(pt4.x, pt4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // Outer Celestial Atmosphere Glow
    const center = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    ctx.strokeStyle = 'rgba(15, 118, 110, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(center.x, center.y, Math.max(30, 85 * zoom), 0, Math.PI * 2);
    ctx.stroke();

  }, [azimuth, elevation, zoom]);

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
            <span>Auto-Orbit Sphere</span>
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
            <Globe className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to rotate primordial CMB celestial sphere (z ≈ 1100)</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Temperature Anisotropies:</span>
            <span className="font-bold text-[#0F766E]">ΔT / T ≈ 10⁻⁵ (±30 μK Fluctuations)</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Acoustic Peak 1 (ℓ = 220): Spatial Flatness Ω_k = 0.0007 ± 0.0019
          </div>
        </div>
      </div>
    </div>
  );
};
