import React, { useRef, useEffect } from 'react';

interface SeismicHodogram3DProps {
  vz: number[];
  vn: number[];
  ve: number[];
  rectilinearityL: number;
  planarityP: number;
  backAzimuthDeg: number;
}

export const SeismicHodogram3D: React.FC<SeismicHodogram3DProps> = ({
  vz,
  vn,
  ve,
  rectilinearityL,
  planarityP,
  backAzimuthDeg,
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
      angle += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark seismic canvas background
      ctx.fillStyle = '#0F1319';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coordinate axes projection
      const rotY = angle;
      const rotX = 0.45;

      const project = (x: number, y: number, z: number) => {
        const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        const scale = 220 / (220 + z2);
        return { px: cx + x1 * scale, py: cy + y2 * scale };
      };

      // Draw 3D Reference Cube/Graticule
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.3)';
      ctx.lineWidth = 1;
      const r = 70;
      const corners = [
        project(-r, -r, -r),
        project(r, -r, -r),
        project(r, r, -r),
        project(-r, r, -r),
        project(-r, -r, r),
        project(r, -r, r),
        project(r, r, r),
        project(-r, r, r),
      ];
      ctx.beginPath();
      // Bottom face
      ctx.moveTo(corners[0].px, corners[0].py);
      ctx.lineTo(corners[1].px, corners[1].py);
      ctx.lineTo(corners[2].px, corners[2].py);
      ctx.lineTo(corners[3].px, corners[3].py);
      ctx.closePath();
      // Top face
      ctx.moveTo(corners[4].px, corners[4].py);
      ctx.lineTo(corners[5].px, corners[5].py);
      ctx.lineTo(corners[6].px, corners[6].py);
      ctx.lineTo(corners[7].px, corners[7].py);
      ctx.closePath();
      // Pillars
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(corners[k].px, corners[k].py);
        ctx.lineTo(corners[k + 4].px, corners[k + 4].py);
      }
      ctx.stroke();

      // Draw Principal Polarization Vector (Back-Azimuth ray)
      const rayLen = 85;
      const thetaRad = (backAzimuthDeg * Math.PI) / 180.0;
      const rayOrigin = project(0, 0, 0);
      const rayEnd = project(
        rayLen * Math.sin(thetaRad) * rectilinearityL,
        -rayLen * 0.7 * rectilinearityL,
        rayLen * Math.cos(thetaRad) * rectilinearityL
      );

      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rayOrigin.px, rayOrigin.py);
      ctx.lineTo(rayEnd.px, rayEnd.py);
      ctx.stroke();

      // Particle Motion Trajectory (Hodogram)
      const nPts = Math.min(vz.length, 180);
      ctx.beginPath();
      ctx.strokeStyle = rectilinearityL > 0.7 ? '#10B981' : '#38BDF8';
      ctx.lineWidth = 1.2;

      for (let i = 0; i < nPts; i++) {
        // Map E -> X, Z -> -Y, N -> Z
        const e = (ve[i] || 0) * 12.0;
        const z = -(vz[i] || 0) * 12.0;
        const n = (vn[i] || 0) * 12.0;
        const pt = project(e, z, n);
        if (i === 0) ctx.moveTo(pt.px, pt.py);
        else ctx.lineTo(pt.px, pt.py);
      }
      ctx.stroke();

      // Labels
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`Flinn Rectilinearity L: ${rectilinearityL}`, 24, canvas.height - 38);
      ctx.fillText(`Flinn Planarity P: ${planarityP}`, 24, canvas.height - 24);
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(`Back-Azimuth: ${backAzimuthDeg}°`, canvas.width - 150, canvas.height - 24);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [vz, vn, ve, rectilinearityL, planarityP, backAzimuthDeg]);

  return (
    <div className="relative w-full h-72 rounded-md overflow-hidden border border-[#DDD6C7] bg-[#0F1319]">
      <canvas ref={canvasRef} width={480} height={288} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[10px] font-mono text-[#94A3B8] bg-[#0F1319]/80 px-2 py-0.5 rounded border border-[#334155]">
        3D Tri-Axial Particle Motion Hodogram &amp; Flinn Ellipsoid
      </div>
    </div>
  );
};
