import React, { useRef, useEffect } from 'react';

interface GraceTwinOrbit3DProps {
  equivalentWaterThicknessCm: number;
}

export const GraceTwinOrbit3D: React.FC<GraceTwinOrbit3DProps> = ({
  equivalentWaterThicknessCm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.012;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Dark orbital canvas
      ctx.fillStyle = '#0B111A';
      ctx.fillRect(0, 0, w, h);

      // Distant stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      for (let s = 0; s < 25; s++) {
        const sx = ((s * 41) % w);
        const sy = ((s * 29) % (h * 0.6));
        ctx.fillRect(sx, sy, 1, 1);
      }

      // Earth Curved Horizon (Low Earth Orbit at 500 km)
      const earthRadius = 550;
      const earthCx = w / 2;
      const earthCy = h + 420;

      const earthGrad = ctx.createRadialGradient(earthCx, earthCy - 40, 200, earthCx, earthCy, earthRadius);
      earthGrad.addColorStop(0, '#0284C7');
      earthGrad.addColorStop(0.3, '#0369A1');
      earthGrad.addColorStop(0.7, '#0F172A');
      earthGrad.addColorStop(1, '#020617');

      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.arc(earthCx, earthCy, earthRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Atmospheric Glow Ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(earthCx, earthCy, earthRadius + 4, Math.PI + 0.5, 2 * Math.PI - 0.5);
      ctx.stroke();

      // Subterranean Mass Anomaly (Hydrology groundwater depletion plume)
      const anomalyX = w / 2;
      const anomalyY = earthCy - earthRadius + 14;

      const plumeGrad = ctx.createRadialGradient(anomalyX, anomalyY, 2, anomalyX, anomalyY, 38);
      plumeGrad.addColorStop(0, 'rgba(239, 68, 68, 0.7)');
      plumeGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.2)');
      plumeGrad.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.arc(anomalyX, anomalyY, 38, 0, 2 * Math.PI);
      ctx.fill();

      // Satellite Positions in Orbit Track (Alt = 500 km, separation = 220 km)
      const orbitY = 55;
      const satSpacing = 110;
      const leadX = (w / 2 + 55 + Math.sin(time) * 45);
      const trailX = leadX - satSpacing;

      // K-Band Microwave Dual Ranging Link Beam
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(trailX, orbitY);
      ctx.lineTo(leadX, orbitY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Gravity Attraction Vectors toward Anomaly
      const drawGravPull = (satX: number, label: string) => {
        const dx = anomalyX - satX;
        const dy = anomalyY - orbitY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normDx = (dx / dist) * 22;
        const normDy = (dy / dist) * 22;

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(satX, orbitY);
        ctx.lineTo(satX + normDx, orbitY + normDy);
        ctx.stroke();

        // Satellite Body
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(satX - 6, orbitY - 4, 12, 8);
        ctx.fillStyle = '#0284C7';
        ctx.fillRect(satX - 10, orbitY - 2, 4, 4);
        ctx.fillRect(satX + 6, orbitY - 2, 4, 4);

        ctx.font = '9px monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(label, satX - 18, orbitY - 8);
      };

      drawGravPull(trailX, 'GRACE-B');
      drawGravPull(leadX, 'GRACE-A');

      // Labels & Telemetry
      ctx.font = '10px monospace';
      ctx.fillStyle = '#EF4444';
      ctx.fillText(`Mass Deficit Anomaly`, anomalyX - 55, anomalyY + 22);
      ctx.fillStyle = '#F59E0B';
      ctx.fillText(`K-Band Ranging (220 km)`, (trailX + leadX) / 2 - 60, orbitY + 16);
      ctx.fillStyle = '#34D399';
      ctx.fillText(`EWT Anomaly: ${equivalentWaterThicknessCm} cm`, 20, h - 20);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [equivalentWaterThicknessCm]);

  return (
    <div className="relative w-full h-72 rounded-md overflow-hidden border border-[#DDD6C7] bg-[#0B111A]">
      <canvas ref={canvasRef} width={480} height={288} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[10px] font-mono text-[#94A3B8] bg-[#0B111A]/80 px-2 py-0.5 rounded border border-[#1E293B]">
        3D GRACE-FO Tandem K-Band Microwave Inversion
      </div>
    </div>
  );
};

