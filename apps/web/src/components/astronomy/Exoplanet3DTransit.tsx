import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Orbit, Eye } from 'lucide-react';

export const Exoplanet3DTransit: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Controls
  const [azimuth, setAzimuth] = useState<number>(15); // deg
  const [elevation, setElevation] = useState<number>(10); // deg
  const [zoom, setZoom] = useState<number>(1.25);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Orbital phase phi in [-0.5, 0.5] where transit occurs at phi = 0
  const [orbitalPhase, setOrbitalPhase] = useState<number>(-0.08);
  const [inclinationDeg, setInclinationDeg] = useState<number>(89.9); // near edge-on

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setOrbitalPhase((prev) => {
        const next = prev + 0.0015;
        if (next > 0.5) return -0.5;
        return next;
      });
    }, 25);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Main 3D Canvas Rendering
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clean scientific ivory parchment background
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    // Graticule grid
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
    const semiMajorAxis = 1.6; // normalized orbit scale
    const incRad = (inclinationDeg * Math.PI) / 180;

    // 1. Draw Keplerian Orbit Ellipse in 3D
    const orbitPts = 64;
    ctx.strokeStyle = '#DDD6C7';
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let k = 0; k <= orbitPts; k++) {
      const th = (k / orbitPts) * 2 * Math.PI;
      // Incline orbit by inclinationDeg relative to observer XY plane
      const ox = semiMajorAxis * Math.sin(th);
      const oy = semiMajorAxis * Math.cos(th) * Math.cos(incRad);
      const oz = semiMajorAxis * Math.cos(th) * Math.sin(incRad);

      const p = project3DTo2D({ x: ox, y: oy, z: oz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Compute Planet Position
    const thPlanet = orbitalPhase * 2 * Math.PI;
    const px = semiMajorAxis * Math.sin(thPlanet);
    const py = semiMajorAxis * Math.cos(thPlanet) * Math.cos(incRad);
    const pz = semiMajorAxis * Math.cos(thPlanet) * Math.sin(incRad);

    const projPlanet = project3DTo2D({ x: px, y: py, z: pz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const projStar = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // Stellar radius on screen
    const starRadiusScreen = Math.max(35, 65 * zoom);

    // Planet passes in FRONT of star if py > 0 (toward observer)
    const isPlanetInFront = py >= 0;

    // Helper to draw the Host Star with Quadratic Limb-Darkening
    const drawStar = () => {
      // Radial gradient approximating I(mu) = I_0 * [1 - u1*(1-mu) - u2*(1-mu)^2]
      const grad = ctx.createRadialGradient(
        projStar.x - starRadiusScreen * 0.15,
        projStar.y - starRadiusScreen * 0.15,
        starRadiusScreen * 0.05,
        projStar.x,
        projStar.y,
        starRadiusScreen
      );
      grad.addColorStop(0.0, '#FFFBEB'); // Bright center (mu = 1)
      grad.addColorStop(0.5, '#FDE68A'); // Warm mid-disk
      grad.addColorStop(0.85, '#D97706'); // Limb darkening starts
      grad.addColorStop(1.0, '#92400E'); // Dark stellar limb (mu = 0)

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(projStar.x, projStar.y, starRadiusScreen, 0, Math.PI * 2);
      ctx.fill();

      // Stellar Atmosphere Corona
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#1F2430';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('Host Star: Kepler-186 (M1V)', projStar.x - 60, projStar.y + starRadiusScreen + 16);
    };

    // Helper to draw Planet (Kepler-186f)
    const drawPlanet = () => {
      const planetRadiusScreen = Math.max(5, 9 * zoom);

      // Planet disk
      ctx.fillStyle = '#1F2430';
      ctx.beginPath();
      ctx.arc(projPlanet.x, projPlanet.y, planetRadiusScreen, 0, Math.PI * 2);
      ctx.fill();

      // Planet atmosphere rim in Deep Teal
      ctx.strokeStyle = '#0F766E';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Distance from star center on sky plane
      const dxSky = projPlanet.x - projStar.x;
      const dySky = projPlanet.y - projStar.y;
      const distSky = Math.sqrt(dxSky * dxSky + dySky * dySky);

      // If planet is transiting (in front and inside disk)
      if (isPlanetInFront && distSky < starRadiusScreen + planetRadiusScreen) {
        // Draw transit ingress / silhouette shadow
        ctx.strokeStyle = '#C0392B';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(projPlanet.x, projPlanet.y, planetRadiusScreen + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#C0392B';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText('Transit Ingress: ΔF/F = -500 ppm', projPlanet.x + 12, projPlanet.y - 8);
      } else {
        ctx.fillStyle = '#4A5060';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText('Kepler-186f (1.17 R⊕)', projPlanet.x + 10, projPlanet.y - 6);
      }
    };

    // Depth sorting: if planet is behind star, draw planet first, then star
    if (!isPlanetInFront) {
      drawPlanet();
      drawStar();
    } else {
      drawStar();
      drawPlanet();
    }

    // 3. Coordinate Axes
    const origin = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axX = project3DTo2D({ x: B * 1.05, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const axY = project3DTo2D({ x: 0, y: B * 1.05, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#0F766E';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axX.x, axX.y);
    ctx.stroke();

    ctx.strokeStyle = '#4338CA';
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(axY.x, axY.y);
    ctx.stroke();

  }, [azimuth, elevation, zoom, orbitalPhase, inclinationDeg]);

  // Redraw on state change
  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawScene();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [drawScene]);

  // Mouse Drag Handlers
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

  // View Presets
  const setPreset = (type: 'observer' | 'edgeon' | 'polar') => {
    if (type === 'observer') {
      setAzimuth(0);
      setElevation(0);
      setZoom(1.3);
    } else if (type === 'edgeon') {
      setAzimuth(90);
      setElevation(0);
      setZoom(1.3);
    } else {
      setAzimuth(0);
      setElevation(82);
      setZoom(1.15);
    }
  };

  // Instantaneous transit flux calculation
  const isTransitActive = Math.abs(orbitalPhase) < 0.035;
  const transitDepthPpm = isTransitActive
    ? 500 * (1 - Math.pow(orbitalPhase / 0.035, 2))
    : 0;

  return (
    <div className="space-y-3 font-sans">
      {/* 3D Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F766E] text-white font-bold hover:bg-[#0D655E] transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Orbit' : 'Play Orbit'}</span>
          </button>

          {/* View Presets */}
          <div className="flex items-center gap-1 border border-[#DDD6C7] rounded bg-[#FFFFFF] p-0.5">
            <button
              type="button"
              onClick={() => setPreset('observer')}
              className="px-2 py-0.5 rounded text-[10px] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]"
              title="Earth Observer Line of Sight"
            >
              <Eye className="w-3 h-3 inline mr-1" />
              Observer LOS
            </button>
            <button
              type="button"
              onClick={() => setPreset('edgeon')}
              className="px-2 py-0.5 rounded text-[10px] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]"
              title="Edge-on Orbit"
            >
              Edge-On
            </button>
            <button
              type="button"
              onClick={() => setPreset('polar')}
              className="px-2 py-0.5 rounded text-[10px] text-[#4A5060] hover:text-[#1F2430] hover:bg-[#EFEBE0]"
              title="Ecliptic Pole"
            >
              <Orbit className="w-3 h-3 inline mr-1" />
              Polar
            </button>
          </div>
        </div>

        {/* Inclination Slider & Zoom */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6F7B]">
            <span>Inclination (i):</span>
            <input
              type="range"
              min="85.0"
              max="90.0"
              step="0.1"
              value={inclinationDeg}
              onChange={(e) => setInclinationDeg(parseFloat(e.target.value))}
              className="w-20 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430]">{inclinationDeg.toFixed(1)}°</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.15))}
              className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
              className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setAzimuth(15); setElevation(10); setZoom(1.25); }}
              className="p-1 rounded bg-[#FFFFFF] border border-[#DDD6C7] hover:bg-[#EFEBE0] text-[#4A5060]"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="w-full h-84 sm:h-96 rounded-md border border-[#DDD6C7] relative overflow-hidden bg-[#FFFDF9] cursor-grab active:cursor-grabbing select-none shadow-2xs"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Orientation Overlay */}
        <div className="absolute top-2 left-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-2.5 py-1 text-[10px] font-mono text-[#4A5060] shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5 font-bold text-[#1F2430]">
            <Compass className="w-3 h-3 text-[#0F766E]" />
            <span>Azimuth: {Math.round(azimuth)}° • Pitch: {Math.round(elevation)}°</span>
          </div>
          <div>Drag to rotate planetary orbital plane, wheel to zoom</div>
        </div>

        {/* Dynamic Transit Telemetry Box */}
        <div className="absolute top-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-3 py-1.5 text-[10px] font-mono shadow-2xs pointer-events-none">
          <div className="text-[#6B6F7B]">Normalized Flux F/F₀:</div>
          <div className={`text-base font-bold ${isTransitActive ? 'text-[#C0392B]' : 'text-[#0F766E]'}`}>
            {(1.0 - transitDepthPpm * 1e-6).toFixed(6)}
          </div>
          <div className="text-[9px] text-[#6B6F7B]">
            {isTransitActive ? `Transit Active: -${transitDepthPpm.toFixed(0)} ppm dip` : 'Out-of-Transit Baseline'}
          </div>
        </div>

        {/* Orbital Phase Slider */}
        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Orbital Phase:</span>
            <span className="font-bold text-[#1F2430]">
              {(orbitalPhase * 360).toFixed(1)}° ({isTransitActive ? 'Central Transit' : 'Orbital Arc'})
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1 max-w-xs">
            <span className="text-[10px] text-[#6B6F7B]">-180°</span>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.002"
              value={orbitalPhase}
              onChange={(e) => setOrbitalPhase(parseFloat(e.target.value))}
              className="w-full accent-[#0F766E] cursor-pointer"
            />
            <span className="text-[10px] text-[#6B6F7B]">+180°</span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            Mandel-Agol Quadratic Limb Darkening
          </div>
        </div>
      </div>
    </div>
  );
};
