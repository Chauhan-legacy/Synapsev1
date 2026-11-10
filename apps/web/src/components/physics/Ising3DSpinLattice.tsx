import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Thermometer } from 'lucide-react';

export const Ising3DSpinLattice: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [azimuth, setAzimuth] = useState<number>(45);
  const [elevation, setElevation] = useState<number>(35);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(2.27); // near Tc = 2.269
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // 24x24 Spin Lattice State: +1 (Deep Teal) or -1 (Indigo)
  const [spins, setSpins] = useState<number[][]>(() => {
    const L = 20;
    const grid: number[][] = [];
    for (let i = 0; i < L; i++) {
      grid[i] = [];
      for (let j = 0; j < L; j++) {
        grid[i][j] = Math.random() > 0.5 ? 1 : -1;
      }
    }
    return grid;
  });

  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!isAutoOrbit) return;
    const interval = setInterval(() => {
      setAzimuth((prev) => (prev + 0.4) % 360);
    }, 25);
    return () => clearInterval(interval);
  }, [isAutoOrbit]);

  // Metropolis Monte Carlo Simulation Step
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSpins((prev) => {
        const L = prev.length;
        const next = prev.map((row) => [...row]);
        const J = 1.0;
        const beta = 1.0 / Math.max(0.1, temperature);

        // Perform 400 random spin flip trials per tick
        for (let step = 0; step < 300; step++) {
          const r = Math.floor(Math.random() * L);
          const c = Math.floor(Math.random() * L);
          const s = next[r][c];

          // Nearest neighbor sum with periodic boundary conditions
          const neighbors =
            next[(r + 1) % L][c] +
            next[(r - 1 + L) % L][c] +
            next[r][(c + 1) % L] +
            next[r][(c - 1 + L) % L];

          const deltaE = 2 * J * s * neighbors;

          if (deltaE <= 0 || Math.random() < Math.exp(-deltaE * beta)) {
            next[r][c] = -s; // Accept flip
          }
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isRunning, temperature]);

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
    const L = spins.length;

    // Draw 3D Spin Lattice Grid as elevated 3D cubes / pillars
    for (let i = 0; i < L; i++) {
      const xNorm = ((i / (L - 1)) * 2 - 1) * B * 0.85;
      for (let j = 0; j < L; j++) {
        const yNorm = ((j / (L - 1)) * 2 - 1) * B * 0.85;
        const s = spins[i][j];
        const zNorm = s > 0 ? 0.25 : -0.25;

        const pTop = project3DTo2D({ x: xNorm, y: yNorm, z: zNorm, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

        // Spin +1 = Deep Teal, Spin -1 = Indigo
        ctx.fillStyle = s > 0 ? '#0F766E' : '#4338CA';
        ctx.beginPath();
        ctx.arc(pTop.x, pTop.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

  }, [azimuth, elevation, zoom, spins]);

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

  // Compute live average magnetization |M|
  const L = spins.length;
  let totalM = 0;
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L; j++) totalM += spins[i][j];
  }
  const avgM = Math.abs(totalM / (L * L));

  return (
    <div className="space-y-3 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
              isRunning ? 'bg-[#0F766E] text-white font-bold' : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#4A5060]'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? 'Pause Monte Carlo' : 'Run Monte Carlo'}</span>
          </button>

          <div className="flex items-center gap-2 text-[11px] text-[#6B6F7B]">
            <Thermometer className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Temp (T/J):</span>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-24 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-12">{temperature.toFixed(2)}</span>
            <button
              type="button"
              onClick={() => setTemperature(2.27)}
              className="px-1.5 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] border border-[#0F766E]/30 font-bold"
            >
              Snap T_c (2.269)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            className={`p-1 rounded border text-xs ${
              isAutoOrbit ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-[#FFFFFF] border-[#DDD6C7] text-[#4A5060]'
            }`}
            title="Toggle Auto Orbit"
          >
            {isAutoOrbit ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
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
            onClick={() => { setAzimuth(45); setElevation(35); setZoom(1.2); setTemperature(2.27); }}
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
          <div>Drag to rotate 3D Metropolis-Hastings Spin Lattice (20 × 20)</div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Spontaneous Magnetization:</span>
            <span className="font-bold text-[#0F766E]">|M| = {avgM.toFixed(3)} {temperature < 2.269 ? '(Ferromagnetic Order)' : '(Disordered Paramagnet)'}</span>
          </div>
          <div className="text-[10px] text-[#4338CA] font-bold">
            Onsager Critical Point: k_B T_c / J = 2 / ln(1 + √2) ≈ 2.269185
          </div>
        </div>
      </div>
    </div>
  );
};
