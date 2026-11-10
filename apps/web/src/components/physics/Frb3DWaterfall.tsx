import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Sliders } from 'lucide-react';

export const Frb3DWaterfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(50);
  const [elevation, setElevation] = useState<number>(30);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const [trialDm, setTrialDm] = useState<number>(0); // 0 = raw dispersed, 348.8 = fully dedispersed

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
    const actualDm = 348.8; // true DM
    const residualDm = actualDm - trialDm;

    // 3D Waterfall: X = Time t, Y = Radio Frequency f (400-800 MHz), Z = Flux Density
    const numChannels = 32;
    const timeSteps = 40;

    for (let c = 0; c < numChannels; c++) {
      const fNorm = c / (numChannels - 1);
      const freqMhz = 400 + fNorm * 400; // 400 to 800 MHz
      const fGhz = freqMhz / 1000.0;

      // Dispersion sweep delay: Delta t ~ DM * f^-2
      const delayOffset = (4.1488 * residualDm * (1.0 / (fGhz * fGhz) - 1.0 / 0.64)) * 0.003; // scaled
      const channelY = (fNorm * 2 - 1) * B * 0.85;

      const profilePts: Point3D[] = [];
      for (let t = 0; t < timeSteps; t++) {
        const tNorm = ((t / (timeSteps - 1)) * 2 - 1) * B * 0.85;
        // Peak centered at tNorm - delayOffset
        const distFromPeak = tNorm - delayOffset;
        const fluxZ = 1.4 * Math.exp(-Math.pow(distFromPeak / 0.18, 2));

        profilePts.push({ x: tNorm, y: channelY, z: fluxZ, tIndex: t });
      }

      const projPts = profilePts.map((p) =>
        project3DTo2D(p, azimuth, elevation, width, height, zoom, B * 1.5)
      );

      // Stroke channel profile
      const isDedispersed = Math.abs(residualDm) < 15;
      ctx.strokeStyle = isDedispersed ? '#0F766E' : 'rgba(217, 119, 6, 0.7)';
      ctx.lineWidth = isDedispersed ? 1.6 : 1.1;

      ctx.beginPath();
      projPts.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    // Coordinate Axes
    const origin = project3DTo2D({ x: -B * 0.85, y: -B * 0.85, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axT = project3DTo2D({ x: B * 0.9, y: -B * 0.85, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axF = project3DTo2D({ x: -B * 0.85, y: B * 0.9, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axT.x, axT.y);
    ctx.stroke();

    ctx.strokeStyle = '#4338CA';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axF.x, axF.y);
    ctx.stroke();

    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Time (ms) →', axT.x + 8, axT.y);
    ctx.fillText('Frequency (400-800 MHz) ↑', axF.x - 20, axF.y - 8);

  }, [azimuth, elevation, zoom, trialDm]);

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
            <span>Auto-Orbit</span>
          </button>

          {/* Interactive Dedispersion Trial Slider */}
          <div className="flex items-center gap-2 text-[11px] text-[#6B6F7B]">
            <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Trial DM:</span>
            <input
              type="range"
              min="0"
              max="400"
              step="5"
              value={trialDm}
              onChange={(e) => setTrialDm(parseFloat(e.target.value))}
              className="w-24 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-16">{trialDm} pc/cm³</span>
            <button
              type="button"
              onClick={() => setTrialDm(348.8)}
              className="px-1.5 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/30 font-bold"
            >
              Snap True DM
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
            onClick={() => { setAzimuth(50); setElevation(30); setZoom(1.2); setTrialDm(0); }}
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
          <div>Drag to rotate dynamic 3D radio waterfall, slide DM to de-disperse</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">CHIME FRB 20180916B:</span>
            <span className={`font-bold ${Math.abs(trialDm - 348.8) < 15 ? 'text-[#0F766E]' : 'text-[#D97706]'}`}>
              {Math.abs(trialDm - 348.8) < 15 ? 'COHERENTLY DEDISPERSED (Δt → 0)' : `Plasma Sweep Delay Active (Residual ΔDM = ${(348.8 - trialDm).toFixed(1)})`}
            </span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            Cold Plasma Law: Δt = 4.149 ms × DM × (ν₁⁻² - ν₂⁻²)
          </div>
        </div>
      </div>
    </div>
  );
};
