import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Sparkles } from 'lucide-react';

export const CernHiggs3DCollider: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(25);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [beamEnergyTev, setBeamEnergyTev] = useState<number>(13.0);

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
    const rCyl = 1.3;
    const lenCyl = 1.8;

    // 1. Draw 3D Cylindrical Calorimeter Rings (CMS / ATLAS ECAL)
    const numRings = 7;
    const ringPts = 24;
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.9;
    ctx.setLineDash([2, 2]);

    for (let r = 0; r < numRings; r++) {
      const cz = -lenCyl + (r / (numRings - 1)) * 2 * lenCyl;
      ctx.beginPath();
      for (let k = 0; k <= ringPts; k++) {
        const th = (k / ringPts) * Math.PI * 2;
        const p = project3DTo2D({ x: rCyl * Math.cos(th), y: rCyl * Math.sin(th), z: cz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Beam Pipe along Z-axis
    const zPos = project3DTo2D({ x: 0, y: 0, z: lenCyl * 1.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const zNeg = project3DTo2D({ x: 0, y: 0, z: -lenCyl * 1.2, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const vertex = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(zNeg.x, zNeg.y);
    ctx.lineTo(zPos.x, zPos.y);
    ctx.stroke();

    // 3. Collision Vertex Burst (Higgs Boson Production Point)
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // 4. Decay Photon 1 (E1 = 62.5 GeV, Theta1 = 65 deg, Phi1 = 45 deg)
    const ph1Dir: Point3D = { x: 1.2 * Math.cos(Math.PI / 4), y: 1.2 * Math.sin(Math.PI / 4), z: 0.5, tIndex: 0 };
    const pPh1 = project3DTo2D(ph1Dir, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#D97706'; // Amber photon shower 1
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(vertex.x, vertex.y);
    ctx.lineTo(pPh1.x, pPh1.y);
    ctx.stroke();

    // Calorimeter Energy Cluster 1
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(pPh1.x, pPh1.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // 5. Decay Photon 2 (Opposite direction, Theta2 = 115 deg)
    const ph2Dir: Point3D = { x: -1.2 * Math.cos(Math.PI / 4), y: -1.2 * Math.sin(Math.PI / 4), z: -0.5, tIndex: 0 };
    const pPh2 = project3DTo2D(ph2Dir, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.moveTo(vertex.x, vertex.y);
    ctx.lineTo(pPh2.x, pPh2.y);
    ctx.stroke();

    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(pPh2.x, pPh2.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Accompanying Charged Particle Tracks (Weak Curvature in Solenoid B-field)
    ctx.strokeStyle = 'rgba(67, 56, 202, 0.4)';
    ctx.lineWidth = 1.0;
    for (let t = 0; t < 8; t++) {
      const ang = (t / 8) * Math.PI * 2;
      const endPt = project3DTo2D({ x: 0.9 * Math.cos(ang), y: 0.9 * Math.sin(ang), z: (t % 2 === 0 ? 0.7 : -0.7), tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      ctx.beginPath();
      ctx.moveTo(vertex.x, vertex.y);
      ctx.lineTo(endPt.x, endPt.y);
      ctx.stroke();
    }

    // Annotations
    ctx.fillStyle = '#1F2430';
    ctx.font = 'bold 10px JetBrains Mono, monospace';
    ctx.fillText('γ₁ Energy Cluster (E₁ = 64.2 GeV)', pPh1.x + 10, pPh1.y - 6);
    ctx.fillText('γ₂ Energy Cluster (E₂ = 60.9 GeV)', pPh2.x - 140, pPh2.y + 16);
    ctx.fillText('p-p Interaction Point (√s = 13 TeV)', vertex.x - 60, vertex.y - 12);

  }, [azimuth, elevation, zoom, beamEnergyTev]);

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
            <span>Auto-Orbit Barrel</span>
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6F7B]">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Beam Energy:</span>
            <input
              type="range"
              min="7.0"
              max="14.0"
              step="0.5"
              value={beamEnergyTev}
              onChange={(e) => setBeamEnergyTev(parseFloat(e.target.value))}
              className="w-16 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430]">{beamEnergyTev} TeV</span>
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
            onClick={() => { setAzimuth(45); setElevation(25); setZoom(1.2); }}
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
          <div>Drag to rotate CMS/ATLAS Electromagnetic Calorimeter</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Invariant Mass:</span>
            <span className="font-bold text-[#0F766E]">m_γγ = 125.09 ± 0.24 GeV</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Higgs Discovery Threshold: Z = 6.5σ (p &lt; 10⁻¹⁰)
          </div>
        </div>
      </div>
    </div>
  );
};

