import React, { useRef, useEffect } from 'react';

interface Gnss3DIonosphereProps {
  s4Index: number;
  elevationDeg: number;
  ippLat: number;
  ippLon: number;
}

export const Gnss3DIonosphere: React.FC<Gnss3DIonosphereProps> = ({
  s4Index,
  elevationDeg,
  ippLat,
  ippLon,
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
      angle += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const rEarth = 68;
      const rIono = 98;

      // Deep space background
      ctx.fillStyle = '#0F1319';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 30; s++) {
        const sx = ((s * 37) % canvas.width);
        const sy = ((s * 53) % canvas.height);
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Geomagnetic Field Lines (dipole)
      ctx.strokeStyle = 'rgba(15, 118, 110, 0.25)';
      ctx.lineWidth = 1;
      for (let m = -2; m <= 2; m++) {
        if (m === 0) continue;
        ctx.beginPath();
        const bRadius = rEarth * (1.4 + Math.abs(m) * 0.4);
        ctx.ellipse(cx, cy, bRadius, bRadius * 0.65, angle * 0.2, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Ionospheric Shell (F-Region at 350 km)
      const ionoGradient = ctx.createRadialGradient(cx, cy, rEarth, cx, cy, rIono + 12);
      ionoGradient.addColorStop(0, 'rgba(15, 118, 110, 0.0)');
      ionoGradient.addColorStop(0.7, s4Index > 0.4 ? 'rgba(220, 38, 38, 0.28)' : 'rgba(15, 118, 110, 0.22)');
      ionoGradient.addColorStop(1, 'rgba(15, 118, 110, 0.0)');

      ctx.fillStyle = ionoGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, rIono + 10, 0, 2 * Math.PI);
      ctx.fill();

      // Earth Globe
      const earthGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, rEarth);
      earthGrad.addColorStop(0, '#1E293B');
      earthGrad.addColorStop(0.7, '#0F172A');
      earthGrad.addColorStop(1, '#020617');

      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rEarth, 0, 2 * Math.PI);
      ctx.fill();

      // Earth Graticule Lines
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
      ctx.lineWidth = 1;
      for (let lat = -2; lat <= 2; lat++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + lat * 18, Math.sqrt(Math.max(0, rEarth * rEarth - Math.pow(lat * 18, 2))), 8, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Ground Receiver Station
      const recX = cx - 35;
      const recY = cy + 28;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(recX, recY, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      // Orbiting GNSS Satellite
      const satOrbitR = 145;
      const satAngle = angle + 0.4;
      const satX = cx + satOrbitR * Math.cos(satAngle);
      const satY = cy + satOrbitR * Math.sin(satAngle) * 0.45 - 25;

      // Ray Path from Satellite to Ground Receiver
      ctx.strokeStyle = s4Index > 0.4 ? '#EF4444' : '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(recX, recY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ionospheric Piercing Point (IPP) - intersection of ray with rIono
      const ippT = 0.52;
      const ippX = satX + (recX - satX) * ippT;
      const ippY = satY + (recY - satY) * ippT;

      ctx.fillStyle = s4Index > 0.4 ? '#DC2626' : '#F59E0B';
      ctx.beginPath();
      ctx.arc(ippX, ippY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Plasma bubble scintillation diffraction shimmer
      if (s4Index > 0.2) {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.beginPath();
        const pulse = 10 + 6 * Math.sin(angle * 12);
        ctx.arc(ippX, ippY, pulse, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Satellite Icon
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(satX - 4, satY - 3, 8, 6);
      // Solar Panels
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(satX - 14, satY - 1.5, 9, 3);
      ctx.fillRect(satX + 5, satY - 1.5, 9, 3);

      // Labels
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`GNSS SV (Alt: 20,200 km)`, satX - 35, satY - 10);
      ctx.fillStyle = s4Index > 0.4 ? '#F87171' : '#FBBF24';
      ctx.fillText(`IPP (${ippLat}°, ${ippLon}°)`, ippX + 8, ippY - 4);
      ctx.fillStyle = '#34D399';
      ctx.fillText(`Ground Station`, recX - 30, recY + 14);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [s4Index, elevationDeg, ippLat, ippLon]);

  return (
    <div className="relative w-full h-72 rounded-md overflow-hidden border border-[#DDD6C7] bg-[#0F1319]">
      <canvas ref={canvasRef} width={480} height={288} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[10px] font-mono text-[#94A3B8] bg-[#0F1319]/80 px-2 py-0.5 rounded border border-[#334155]">
        3D GNSS Dual-Frequency Ionospheric Ray Tracer
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] font-mono text-[#94A3B8] bg-[#0F1319]/80 px-2 py-0.5 rounded border border-[#334155]">
        S₄ Index: <span className={s4Index > 0.4 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{s4Index}</span>
      </div>
    </div>
  );
};
