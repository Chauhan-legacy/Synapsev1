import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, ShieldAlert, Sliders } from 'lucide-react';

export const NuclearReactor3DCore: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(30);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true);
  const [controlRodInsertion, setControlRodInsertion] = useState<number>(50); // 0% = withdrawn (prompt critical danger!), 100% = fully scrammed
  const [isScrammed, setIsScrammed] = useState<boolean>(false);

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.4) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  const handleScram = () => {
    setIsScrammed(true);
    setControlRodInsertion(100);
  };

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
    const rodGrid = 5; // 5x5 fuel assembly lattice
    const rodH = 1.8;
    const insertionFrac = controlRodInsertion / 100.0;

    // Reactivity dollars: at 50% insertion, rho = $0 (critical)
    // at 0% insertion (rods out), rho = +$1.20 (PROMPT CRITICAL RUNAWAY)
    // at 100% insertion (rods in), rho = -$2.50 (SHUTDOWN)
    const reactivityDollars = (1.0 - insertionFrac * 2.0) * 1.25;
    const isPromptCritical = reactivityDollars >= 1.0;

    // 1. Draw 3D Core Vessel Outer Cylindrical Shroud
    const shroudR = 1.5;
    const numShroudRings = 4;
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2, 2]);

    for (let r = 0; r < numShroudRings; r++) {
      const cz = -rodH * 0.5 + (r / (numShroudRings - 1)) * rodH;
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const th = (k / 20) * Math.PI * 2;
        const p = project3DTo2D({ x: shroudR * Math.cos(th), y: shroudR * Math.sin(th), z: cz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (k === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 2. Draw 5x5 Fuel Assembly Rods (Uranium Oxide Zircaloy Pins)
    for (let i = 0; i < rodGrid; i++) {
      const rx = ((i / (rodGrid - 1)) * 2 - 1) * 0.95;
      for (let j = 0; j < rodGrid; j++) {
        const ry = ((j / (rodGrid - 1)) * 2 - 1) * 0.95;

        // Alternating fuel rod vs control rod position
        const isControlRod = (i + j) % 2 === 1;

        if (isControlRod) {
          // Cadmium/Boron Control Rod sliding vertically down into core
          // Insertion depth: z goes from 1.2 - rodH * insertionFrac
          const rodTopZ = 1.2 - rodH * insertionFrac;
          const rodBotZ = -0.6 - rodH * (insertionFrac - 1.0);

          const pTop = project3DTo2D({ x: rx, y: ry, z: rodTopZ, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
          const pBot = project3DTo2D({ x: rx, y: ry, z: rodBotZ, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

          ctx.strokeStyle = '#1F2430'; // Dark absorbing control rod
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(pTop.x, pTop.y);
          ctx.lineTo(pBot.x, pBot.y);
          ctx.stroke();
        } else {
          // Uranium Fuel Rod
          const pTop = project3DTo2D({ x: rx, y: ry, z: rodH * 0.5, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
          const pBot = project3DTo2D({ x: rx, y: ry, z: -rodH * 0.5, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

          // Glowing thermal neutron flux: if prompt critical, intense red, otherwise calm deep teal
          ctx.strokeStyle = isPromptCritical ? '#C0392B' : (reactivityDollars > 0 ? '#D97706' : '#0F766E');
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(pTop.x, pTop.y);
          ctx.lineTo(pBot.x, pBot.y);
          ctx.stroke();
        }
      }
    }

    // 3. Fission Neutron Flux Cloud Sparks
    const numNeutrons = isPromptCritical ? 30 : 12;
    for (let k = 0; k < numNeutrons; k++) {
      const nx = (Math.random() - 0.5) * 1.8;
      const ny = (Math.random() - 0.5) * 1.8;
      const nz = (Math.random() - 0.5) * 1.2;
      const pN = project3DTo2D({ x: nx, y: ny, z: nz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

      ctx.fillStyle = isPromptCritical ? '#C0392B' : '#0F766E';
      ctx.beginPath();
      ctx.arc(pN.x, pN.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Annotations
    const center = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('UO₂ Zircaloy Fuel Lattice (25 Assemblies)', center.x - 110, center.y + 110);

  }, [azimuth, elevation, zoom, controlRodInsertion]);

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

  const insertionFrac = controlRodInsertion / 100.0;
  const reactivityDollars = (1.0 - insertionFrac * 2.0) * 1.25;
  const isPromptCritical = reactivityDollars >= 1.0;

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
            <span>Auto-Orbit Core</span>
          </button>

          <button
            type="button"
            onClick={handleScram}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#C0392B] text-white font-bold hover:bg-[#A93226] transition-colors shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>REACTOR SCRAM TRIP</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[#6B6F7B]">
            <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Control Rods:</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={controlRodInsertion}
              onChange={(e) => {
                setControlRodInsertion(parseInt(e.target.value));
                if (parseInt(e.target.value) < 100) setIsScrammed(false);
              }}
              className="w-20 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-12">{controlRodInsertion}% In</span>
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
            onClick={() => { setAzimuth(45); setElevation(30); setZoom(1.2); setControlRodInsertion(50); setIsScrammed(false); }}
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
          <div>Drag to rotate Westinghouse PWR 3D Nuclear Core Assembly</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Reactivity Status:</span>
            <span className={`font-bold ${isPromptCritical ? 'text-[#C0392B] animate-pulse' : (reactivityDollars > 0 ? 'text-[#D97706]' : 'text-[#0F766E]')}`}>
              ρ = {reactivityDollars >= 0 ? `+${reactivityDollars.toFixed(2)}` : reactivityDollars.toFixed(2)}$ {isPromptCritical ? '(DANGER: PROMPT CRITICAL EXCURSION!)' : (isScrammed ? '(SHUTDOWN SUBCRITICAL)' : '(CRITICAL REGULATED)')}
            </span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            6-Group Delayed Precursor Balance: β = 0.0065, Λ = 100 μs
          </div>
        </div>
      </div>
    </div>
  );
};
