import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Clock, Zap } from 'lucide-react';

export const Muon3DRelativity: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(35);
  const [elevation, setElevation] = useState<number>(20);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [velocityFraction, setVelocityFraction] = useState<number>(0.9994); // v = 0.9994 c

  const [muonAltitudeKm, setMuonAltitudeKm] = useState<number>(15.0); // 15 km altitude

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Lorentz Gamma Factor: gamma = 1 / sqrt(1 - beta^2)
  const gamma = 1.0 / Math.sqrt(Math.max(0.001, 1.0 - velocityFraction * velocityFraction));

  // Muon descent animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setMuonAltitudeKm((prev) => {
        const next = prev - 0.25;
        if (next <= 0) return 15.0; // Reset at sea level
        return next;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying]);

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

    // 1. Earth Sea Level Surface Plane at Z = -1.2
    const seaPts: Point3D[] = [
      { x: -1.6, y: -1.6, z: -1.2, tIndex: 0 },
      { x: 1.6, y: -1.6, z: -1.2, tIndex: 0 },
      { x: 1.6, y: 1.6, z: -1.2, tIndex: 0 },
      { x: -1.6, y: 1.6, z: -1.2, tIndex: 0 },
    ];
    const projSea = seaPts.map((p) => project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5));

    ctx.fillStyle = 'rgba(238, 234, 224, 0.7)';
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    projSea.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Atmospheric Altitude Layers (5 km, 10 km, 15 km Stratosphere)
    const altLevels = [
      { km: 5.0, z: -0.4, label: 'Troposphere (5 km)' },
      { km: 10.0, z: 0.4, label: 'Tropopause (10 km)' },
      { km: 15.0, z: 1.2, label: 'Cosmic Ray Shower Source (15 km)' },
    ];

    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);

    altLevels.forEach((lvl) => {
      const ringPts = 16;
      ctx.beginPath();
      for (let k = 0; k <= ringPts; k++) {
        const th = (k / ringPts) * Math.PI * 2;
        const p = project3DTo2D({ x: 1.3 * Math.cos(th), y: 1.3 * Math.sin(th), z: lvl.z, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 3. Muon Particle Track & Current Position
    const muonZ = -1.2 + (muonAltitudeKm / 15.0) * 2.4;
    const pMuon = project3DTo2D({ x: 0, y: 0, z: muonZ, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const pSource = project3DTo2D({ x: 0, y: 0, z: 1.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // Track
    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(pSource.x, pSource.y);
    ctx.lineTo(pMuon.x, pMuon.y);
    ctx.stroke();

    // Muon particle head
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(pMuon.x, pMuon.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Čerenkov Radiation Cone around muon in air
    ctx.strokeStyle = 'rgba(67, 56, 202, 0.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pMuon.x, pMuon.y, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Ground Sea-Level Scintillator Detector
    const pDet = project3DTo2D({ x: 0, y: 0, z: -1.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(pDet.x, pDet.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Annotations
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`Muon Track μ⁻ (Altitude = ${muonAltitudeKm.toFixed(1)} km)`, pMuon.x + 12, pMuon.y - 4);
    ctx.fillText('Sea-Level Scintillator Detector', pDet.x + 12, pDet.y + 14);

  }, [azimuth, elevation, zoom, muonAltitudeKm]);

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
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F766E] text-white font-bold hover:bg-[#0D655E] transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Descent' : 'Resume Descent'}</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[#6B6F7B]">
            <Zap className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Velocity (v/c):</span>
            <input
              type="range"
              min="0.9"
              max="0.9999"
              step="0.001"
              value={velocityFraction}
              onChange={(e) => setVelocityFraction(parseFloat(e.target.value))}
              className="w-20 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-16">{velocityFraction.toFixed(4)} c</span>
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
            onClick={() => { setAzimuth(35); setElevation(20); setZoom(1.2); setVelocityFraction(0.9994); }}
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
            <Clock className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to rotate relativistic atmospheric column</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Lorentz Time Dilation:</span>
            <span className="font-bold text-[#0F766E]">γ = {gamma.toFixed(1)}× (τ_dilated = {(2.197 * gamma).toFixed(1)} μs)</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Survival Rate: P = exp(-t / γτ₀) = 79.2% (Classical: 0.00003%)
          </div>
        </div>
      </div>
    </div>
  );
};
