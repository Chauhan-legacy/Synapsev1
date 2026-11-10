import React, { useRef, useEffect, useState, useCallback } from 'react';
import { project3DTo2D, Point3D } from '../../utils/advancedMathEngines';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Compass, Radio, Sliders } from 'lucide-react';

export const Pulsar3DLighthouse: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera Controls
  const [azimuth, setAzimuth] = useState<number>(30); // deg
  const [elevation, setElevation] = useState<number>(25); // deg
  const [zoom, setZoom] = useState<number>(1.25);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [spinSpeed, setSpinSpeed] = useState<number>(1.0); // 1x = slow-mo inspection, 5x = fast

  // Physical Parameters
  const [magneticTiltDeg, setMagneticTiltDeg] = useState<number>(60); // alpha = 60 deg
  const [beamOpeningDeg, setBeamOpeningDeg] = useState<number>(16); // rho = 16 deg

  // Live rotation angle (radians)
  const [spinAngle, setSpinAngle] = useState<number>(0);
  const [pulseIntensity, setPulseIntensity] = useState<number>(0);

  // Mouse Drag Orbit
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Physics animation loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSpinAngle((prev) => (prev + 0.08 * spinSpeed) % (Math.PI * 2));
    }, 25);
    return () => clearInterval(interval);
  }, [isPlaying, spinSpeed]);

  // Main 3D Canvas Rendering
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background: Clean ivory paper
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    // Subtle graticule grid
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
    const alphaRad = (magneticTiltDeg * Math.PI) / 180;
    const rhoRad = (beamOpeningDeg * Math.PI) / 180;

    // 1. Mechanical Spin Axis Vector (Along Z axis)
    const spinTop = project3DTo2D({ x: 0, y: 0, z: 1.8, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const spinBot = project3DTo2D({ x: 0, y: 0, z: -1.8, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    ctx.strokeStyle = '#6B6F7B';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(spinBot.x, spinBot.y);
    ctx.lineTo(spinTop.x, spinTop.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Compute Tilted Magnetic Axis Vector mu(t) rotating around Z
    // mu = [sin(alpha)*cos(spinAngle), sin(alpha)*sin(spinAngle), cos(alpha)]
    const muX = Math.sin(alphaRad) * Math.cos(spinAngle);
    const muY = Math.sin(alphaRad) * Math.sin(spinAngle);
    const muZ = Math.cos(alphaRad);

    const beamLen = 1.6;
    const magNorth = project3DTo2D({ x: muX * beamLen, y: muY * beamLen, z: muZ * beamLen, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
    const center = project3DTo2D({ x: 0, y: 0, z: 0, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);

    // 3. Draw 3D Magnetic Dipole Field Loops
    ctx.strokeStyle = 'rgba(67, 56, 202, 0.25)'; // Indigo magnetic loops
    ctx.lineWidth = 1;
    const numLoops = 6;
    for (let l = 0; l < numLoops; l++) {
      const loopPhi = (l / numLoops) * Math.PI * 2 + spinAngle;
      ctx.beginPath();
      for (let t = 0.1; t < Math.PI - 0.1; t += 0.15) {
        // Dipole field line: r = R0 * sin^2(theta)
        const rDip = 1.1 * Math.sin(t) * Math.sin(t);
        // Align with magnetic axis
        const lx = rDip * Math.sin(t) * Math.cos(loopPhi);
        const ly = rDip * Math.sin(t) * Math.sin(loopPhi);
        const lz = rDip * Math.cos(t);

        // Rotate into magnetic frame tilted by alpha
        const rx = lx * Math.cos(alphaRad) + lz * Math.sin(alphaRad);
        const ry = ly;
        const rz = -lx * Math.sin(alphaRad) + lz * Math.cos(alphaRad);

        const p = project3DTo2D({ x: rx, y: ry, z: rz, tIndex: 0 }, azimuth, elevation, width, height, zoom, B * 1.5);
        if (t === 0.1) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // 4. Draw Relativistic Synchrotron Emission Cones (North & South Poles)
    const drawBeamCone = (bx: number, by: number, bz: number, isNorth: boolean) => {
      const coneR = beamLen * Math.tan(rhoRad);
      const ringPts = 16;
      const coneCircle: Point3D[] = [];

      // Orthonormal basis perpendicular to (bx, by, bz)
      const u1x = -by;
      const u1y = bx;
      const u1Len = Math.sqrt(u1x * u1x + u1y * u1y) || 1;

      const v1x = u1x / u1Len;
      const v1y = u1y / u1Len;
      const v1z = 0;

      const v2x = by * v1z - bz * v1y;
      const v2y = bz * v1x - bx * v1z;
      const v2z = bx * v1y - by * v1x;
      const v2Len = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z) || 1;

      for (let k = 0; k < ringPts; k++) {
        const phi = (k / ringPts) * Math.PI * 2;
        const cx = bx + coneR * (Math.cos(phi) * v1x + Math.sin(phi) * (v2x / v2Len));
        const cy = by + coneR * (Math.cos(phi) * v1y + Math.sin(phi) * (v2y / v2Len));
        const cz = bz + coneR * (Math.cos(phi) * v1z + Math.sin(phi) * (v2z / v2Len));
        coneCircle.push({ x: cx, y: cy, z: cz, tIndex: 0 });
      }

      const projRing = coneCircle.map((pt) =>
        project3DTo2D(pt, azimuth, elevation, width, height, zoom, B * 1.5)
      );

      // Beam interior shading (Deep Teal glow)
      ctx.fillStyle = isNorth ? 'rgba(15, 118, 110, 0.22)' : 'rgba(217, 119, 6, 0.20)';
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      projRing.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();

      // Cone rim line
      ctx.strokeStyle = isNorth ? '#0F766E' : '#D97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      projRing.forEach((p, idx) => {
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();
    };

    drawBeamCone(muX * beamLen, muY * beamLen, muZ * beamLen, true);
    drawBeamCone(-muX * beamLen, -muY * beamLen, -muZ * beamLen, false);

    // 5. Draw Central Neutron Star Sphere (R = 10 km)
    const nsRadius = Math.max(12, 22 * zoom);
    const gradNS = ctx.createRadialGradient(
      center.x - nsRadius * 0.25,
      center.y - nsRadius * 0.25,
      nsRadius * 0.1,
      center.x,
      center.y,
      nsRadius
    );
    gradNS.addColorStop(0.0, '#E6F4F2');
    gradNS.addColorStop(0.6, '#0F766E');
    gradNS.addColorStop(1.0, '#134E4A');

    ctx.fillStyle = gradNS;
    ctx.beginPath();
    ctx.arc(center.x, center.y, nsRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1F2430';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Observer Line of Sight Alignment Test
    // Observer is looking along camera axis: in normalized world coords, line of sight vector is n_obs = [cos(el)*sin(az), cos(el)*cos(az), sin(el)]
    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (elevation * Math.PI) / 180;
    const obsX = Math.cos(elRad) * Math.sin(azRad);
    const obsY = -Math.cos(elRad) * Math.cos(azRad);
    const obsZ = Math.sin(elRad);

    // Dot product with magnetic pole (North & South)
    const dotN = muX * obsX + muY * obsY + muZ * obsZ;
    const dotS = -muX * obsX - muY * obsY - muZ * obsZ;

    const maxDot = Math.max(dotN, dotS);
    const angleToObs = Math.acos(Math.max(-1, Math.min(1, maxDot)));

    // Pulse triggers when angleToObs is within beamOpeningDeg
    const inBeam = angleToObs < rhoRad * 1.5;
    const intensity = inBeam ? Math.pow(Math.max(0, 1 - angleToObs / (rhoRad * 1.5)), 2) : 0;
    setPulseIntensity(intensity);

    if (inBeam) {
      // Flash beacon ring
      ctx.strokeStyle = `rgba(15, 118, 110, ${0.4 + intensity * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, nsRadius + 10 + intensity * 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Labels
    ctx.fillStyle = '#1F2430';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText('Spin Axis Ω (29.85 Hz)', spinTop.x + 8, spinTop.y);
    ctx.fillText('Magnetic Axis B (α = ' + magneticTiltDeg + '°)', magNorth.x + 8, magNorth.y - 4);

  }, [azimuth, elevation, zoom, spinAngle, magneticTiltDeg, beamOpeningDeg]);

  // Redraw on change
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
    setElevation((prev) => Math.max(5, Math.min(85, prev - dy * 0.6)));
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
      {/* 3D Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#F8F6F1] border border-[#DDD6C7] rounded-md font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F766E] text-white font-bold hover:bg-[#0D655E] transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause Spin' : 'Resume Spin'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 border border-[#DDD6C7] rounded bg-[#FFFFFF] p-0.5 text-[11px]">
            <span className="px-1.5 text-[#6B6F7B]">Speed:</span>
            {[0.5, 1.0, 2.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpinSpeed(s)}
                className={`px-1.5 py-0.5 rounded ${
                  spinSpeed === s ? 'bg-[#0F766E] text-white font-bold' : 'text-[#4A5060] hover:bg-[#EFEBE0]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Magnetic Tilt & Beam Opening Sliders */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6F7B]">
            <Sliders className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Tilt (α):</span>
            <input
              type="range"
              min="15"
              max="80"
              step="5"
              value={magneticTiltDeg}
              onChange={(e) => setMagneticTiltDeg(parseInt(e.target.value))}
              className="w-16 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-6">{magneticTiltDeg}°</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#6B6F7B]">
            <span>Cone (ρ):</span>
            <input
              type="range"
              min="8"
              max="28"
              step="2"
              value={beamOpeningDeg}
              onChange={(e) => setBeamOpeningDeg(parseInt(e.target.value))}
              className="w-16 accent-[#0F766E] cursor-pointer"
            />
            <span className="font-bold text-[#1F2430] w-6">{beamOpeningDeg}°</span>
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
              onClick={() => { setAzimuth(30); setElevation(25); setZoom(1.25); }}
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
          <div>Drag to rotate neutron star magnetosphere, scroll to zoom</div>
        </div>

        {/* Live Pulse Beacon Flash Badge */}
        <div className="absolute top-2 right-2 bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#DDD6C7] rounded px-3 py-1.5 text-[10px] font-mono shadow-2xs pointer-events-none">
          <div className="flex items-center gap-2">
            <Radio className={`w-3.5 h-3.5 ${pulseIntensity > 0.1 ? 'text-[#0F766E] animate-ping' : 'text-[#6B6F7B]'}`} />
            <span className="font-bold text-[#1F2430]">
              {pulseIntensity > 0.1 ? 'OBSERVER BEAM INTERSECTED' : 'Off-Axis Magnetosphere'}
            </span>
          </div>
          <div className="text-[9px] text-[#0F766E] font-semibold mt-0.5">
            Synchrotron Radio Peak: {(pulseIntensity * 100).toFixed(0)}% Flux
          </div>
        </div>

        {/* Telemetry Footer */}
        <div className="absolute bottom-2 left-2 right-2 bg-[#FFFFFF]/95 backdrop-blur-xs border border-[#DDD6C7] rounded-md p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Spin Period:</span>
            <span className="font-bold text-[#1F2430]">P = 33.50 ms (29.85 rev/s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#6B6F7B]">Light Cylinder:</span>
            <span className="font-bold text-[#4338CA]">R_LC = c/Ω = 1,600 km</span>
          </div>
          <div className="text-[10px] text-[#0F766E] font-bold">
            Goldreich-Julian Relativistic Magnetosphere
          </div>
        </div>
      </div>
    </div>
  );
};
