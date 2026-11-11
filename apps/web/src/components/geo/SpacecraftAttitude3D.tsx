import React, { useRef, useEffect } from 'react';

interface SpacecraftAttitude3DProps {
  wheelRpm: number;
  jitterMicroRad: number;
  pointingErrorArcsec: number;
}

export const SpacecraftAttitude3D: React.FC<SpacecraftAttitude3DProps> = ({
  wheelRpm,
  jitterMicroRad,
  pointingErrorArcsec,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      angle += 0.015;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark drafting background
      ctx.fillStyle = '#0F1319';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coordinate Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Micro-jitter harmonic wobble
      const wobbleX = Math.sin(angle * 8.0) * (jitterMicroRad * 0.12);
      const wobbleY = Math.cos(angle * 8.0) * (jitterMicroRad * 0.12);

      const scX = cx + wobbleX;
      const scY = cy + wobbleY;

      // 3D Rotation Matrix projection
      const rotY = angle * 0.4;
      const rotX = 0.35;

      const project = (x: number, y: number, z: number) => {
        // Rotate around Y
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        // Rotate around X
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        const scale = 240 / (240 + z2);
        return { px: scX + x1 * scale, py: scY + y2 * scale };
      };

      // Satellite Box Vertices
      const w = 42, h = 32, d = 35;
      const v = [
        project(-w, -h, -d),
        project(w, -h, -d),
        project(w, h, -d),
        project(-w, h, -d),
        project(-w, -h, d),
        project(w, -h, d),
        project(w, h, d),
        project(-w, h, d),
      ];

      // Draw Satellite Faces
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';

      const drawFace = (i0: number, i1: number, i2: number, i3: number) => {
        ctx.beginPath();
        ctx.moveTo(v[i0].px, v[i0].py);
        ctx.lineTo(v[i1].px, v[i1].py);
        ctx.lineTo(v[i2].px, v[i2].py);
        ctx.lineTo(v[i3].px, v[i3].py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      drawFace(0, 1, 2, 3);
      drawFace(4, 5, 6, 7);
      drawFace(0, 1, 5, 4);
      drawFace(2, 3, 7, 6);

      // Solar Arrays
      const pL1 = project(-w - 60, -8, 0);
      const pL2 = project(-w, -8, 0);
      const pL3 = project(-w, 8, 0);
      const pL4 = project(-w - 60, 8, 0);

      const pR1 = project(w, -8, 0);
      const pR2 = project(w + 60, -8, 0);
      const pR3 = project(w + 60, 8, 0);
      const pR4 = project(w, 8, 0);

      ctx.fillStyle = 'rgba(2, 132, 199, 0.65)';
      ctx.strokeStyle = '#0284C7';

      // Left Panel
      ctx.beginPath();
      ctx.moveTo(pL1.px, pL1.py);
      ctx.lineTo(pL2.px, pL2.py);
      ctx.lineTo(pL3.px, pL3.py);
      ctx.lineTo(pL4.px, pL4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Panel
      ctx.beginPath();
      ctx.moveTo(pR1.px, pR1.py);
      ctx.lineTo(pR2.px, pR2.py);
      ctx.lineTo(pR3.px, pR3.py);
      ctx.lineTo(pR4.px, pR4.py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Reaction Wheel Assembly (spinning internal flywheel disk)
      const wheelAngle = angle * (wheelRpm / 150.0);
      const rwPos = project(0, 0, 0);
      ctx.save();
      ctx.translate(rwPos.px, rwPos.py);
      ctx.rotate(wheelAngle);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 9);
      ctx.stroke();
      ctx.restore();

      // Body Axes [X_b, Y_b, Z_b]
      const origin = project(0, 0, 0);
      const axisX = project(55, 0, 0);
      const axisY = project(0, -55, 0);
      const axisZ = project(0, 0, 55);

      // X Axis (Red)
      ctx.strokeStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisX.px, axisX.py);
      ctx.stroke();

      // Y Axis (Green)
      ctx.strokeStyle = '#10B981';
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisY.px, axisY.py);
      ctx.stroke();

      // Z Axis (Blue - Nadir Pointing)
      ctx.strokeStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(origin.px, origin.py);
      ctx.lineTo(axisZ.px, axisZ.py);
      ctx.stroke();

      // Telemetry Text
      ctx.font = '10px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`RWA: ${wheelRpm} RPM`, 28, canvas.height - 36);
      ctx.fillText(`Micro-Jitter: ${jitterMicroRad} µrad`, 28, canvas.height - 22);
      ctx.fillStyle = pointingErrorArcsec < 0.5 ? '#34D399' : '#FBBF24';
      ctx.fillText(`Pointing Error: ${pointingErrorArcsec}"`, canvas.width - 165, canvas.height - 22);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [wheelRpm, jitterMicroRad, pointingErrorArcsec]);

  return (
    <div className="relative w-full h-72 rounded-md overflow-hidden border border-[#DDD6C7] bg-[#0F1319]">
      <canvas ref={canvasRef} width={480} height={288} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[10px] font-mono text-[#94A3B8] bg-[#0F1319]/80 px-2 py-0.5 rounded border border-[#334155]">
        3D Spacecraft Euler Dynamics &amp; RWA Flywheel
      </div>
    </div>
  );
};
