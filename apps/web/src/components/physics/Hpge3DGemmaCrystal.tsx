import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Shield } from 'lucide-react';

export const Hpge3DGemmaCrystal: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(30);
  const [zoom, setZoom] = useState<number>(1.25);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [activePhotonMode, setActivePhotonMode] = useState<'photoelectric' | 'compton'>('photoelectric');

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
    const crystalR = 1.1;
    const crystalH = 1.6;

    // 1. Draw 3D High-Purity Germanium Semiconductor Ingot Cylinder
    const numRings = 6;
    const ringPts = 20;
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);

    for (let r = 0; r < numRings; r++) {
      const cz = -crystalH * 0.5 + (r / (numRings - 1)) * crystalH;
      ctx.beginPath();
      for (let k = 0; k <= ringPts; k++) {
        const th = (k / ringPts) * Math.PI * 2;
        const p = project3DTo2D({ x: crystalR * Math.cos(th), y: crystalR * Math.sin(th), z: cz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Central p-n Junction Core Contact Wire along Z
    const p1 = project3DTo2D({ x: 0, y: 0, z: -crystalH * 0.5, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const p2 = project3DTo2D({ x: 0, y: 0, z: crystalH * 0.5, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // 2. Incoming Gamma Ray (1332.5 keV) entering Crystal
    const sourcePt = project3DTo2D({ x: -2.2, y: -1.2, z: 1.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const impactPt = project3DTo2D({ x: -0.3, y: -0.2, z: 0.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#D97706'; // Amber gamma photon line
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(sourcePt.x, sourcePt.y);
    ctx.lineTo(impactPt.x, impactPt.y);
    ctx.stroke();

    // 3. Scattering or Full Absorption Reaction
    if (activePhotonMode === 'photoelectric') {
      // Full photoelectric ionization: Electron-hole pair cloud formed
      const cloudPts = 12;
      for (let k = 0; k < cloudPts; k++) {
        const ang = (k / cloudPts) * Math.PI * 2;
        const rCloud = 0.35 * Math.random();
        const pt = project3DTo2D({ x: -0.3 + rCloud * Math.cos(ang), y: -0.2 + rCloud * Math.sin(ang), z: 0.2 + (Math.random() - 0.5) * 0.3, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        ctx.fillStyle = '#0F766E';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#0F766E';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText('Full Photopeak Absorption (1332.5 keV Photoelectron Cascade)', impactPt.x + 12, impactPt.y - 10);
    } else {
      // Compton Scattering: Scattered photon escapes crystal at angle theta = 135 deg
      const scatterPt = project3DTo2D({ x: 1.8, y: 1.5, z: -0.8, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      const recoilElectron = project3DTo2D({ x: 0.4, y: -0.8, z: 0.6, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

      ctx.strokeStyle = '#4338CA'; // Escaping degraded photon
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(impactPt.x, impactPt.y);
      ctx.lineTo(scatterPt.x, scatterPt.y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#C0392B'; // Recoil electron track
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(impactPt.x, impactPt.y);
      ctx.lineTo(recoilElectron.x, recoilElectron.y);
      ctx.stroke();

      ctx.fillStyle = '#C0392B';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText('Compton Recoil Electron (E_e = 1118 keV = Compton Edge)', recoilElectron.x + 8, recoilElectron.y);
    }

  }, [azimuth, elevation, zoom, activePhotonMode]);

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
            <span>Auto-Orbit HPGe</span>
          </button>
          <div className="flex items-center gap-1 border border-[#DDD6C7] rounded bg-[#FFFFFF] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setActivePhotonMode('photoelectric')}
              className={`px-2 py-0.5 rounded font-bold ${
                activePhotonMode === 'photoelectric' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060]'
              }`}
            >
              Photopeak Mode
            </button>
            <button
              type="button"
              onClick={() => setActivePhotonMode('compton')}
              className={`px-2 py-0.5 rounded font-bold ${
                activePhotonMode === 'compton' ? 'bg-[#0F766E] text-white' : 'text-[#4A5060]'
              }`}
            >
              Compton Edge Mode
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
            onClick={() => { setAzimuth(45); setElevation(30); setZoom(1.25); }}
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
            <Shield className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to rotate High-Purity Germanium Cryogenic Crystal</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Nuclear Energy Transition:</span>
            <span className="font-bold text-[#0F766E]">Co-60 Cascade (1173.2 &amp; 1332.5 keV)</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Compton Edge: E_edge = E_γ / [1 + m_e c² / (2 E_γ)] = 963.4 keV
          </div>
        </div>
      </div>
    </div>
  );
};
