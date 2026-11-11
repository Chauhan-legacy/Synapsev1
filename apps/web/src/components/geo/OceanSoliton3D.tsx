import React, { useRef, useEffect } from 'react';

interface OceanSoliton3DProps {
  solitonAmplitudeM: number;
  solitonPhaseSpeedMs: number;
  characteristicWidthM: number;
}

export const OceanSoliton3D: React.FC<OceanSoliton3DProps> = ({
  solitonAmplitudeM,
  solitonPhaseSpeedMs,
  characteristicWidthM,
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
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // Dark oceanic background
      ctx.fillStyle = '#091824';
      ctx.fillRect(0, 0, w, h);

      // Sea Surface (Top layer, z = 0)
      const surfY = 65;
      const pycnoY = 150;
      const bottomY = 245;

      // Draw Air-Sea Boundary
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        // Subtle soliton surface displacement (~15 cm scaled visually)
        const xRel = (x - w / 2 - Math.sin(time * 0.8) * 40) / 35.0;
        const sech = 1.0 / Math.cosh(xRel);
        const surfDisp = 6.0 * (sech * sech);
        const y = surfY - surfDisp + Math.sin(x * 0.06 + time * 2) * 1.5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Mixed Layer (Upper water column, density rho_1 = 1024 kg/m^3)
      ctx.fillStyle = 'rgba(14, 116, 144, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, surfY);
      for (let x = 0; x < w; x++) {
        const xRel = (x - w / 2 - Math.sin(time * 0.8) * 40) / 35.0;
        const sech = 1.0 / Math.cosh(xRel);
        const dep = (solitonAmplitudeM / 1.4) * (sech * sech);
        ctx.lineTo(x, pycnoY + dep);
      }
      ctx.lineTo(w, surfY);
      ctx.closePath();
      ctx.fill();

      // Pycnocline Interface (Density Jump rho_2 - rho_1 = 3.5 kg/m^3)
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const xRel = (x - w / 2 - Math.sin(time * 0.8) * 40) / 35.0;
        const sech = 1.0 / Math.cosh(xRel);
        const dep = (solitonAmplitudeM / 1.4) * (sech * sech);
        const y = pycnoY + dep;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Deep Abyssal Ocean (Lower water column, density rho_2 = 1028 kg/m^3)
      ctx.fillStyle = 'rgba(3, 105, 161, 0.45)';
      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      for (let x = 0; x < w; x++) {
        const xRel = (x - w / 2 - Math.sin(time * 0.8) * 40) / 35.0;
        const sech = 1.0 / Math.cosh(xRel);
        const dep = (solitonAmplitudeM / 1.4) * (sech * sech);
        ctx.lineTo(x, pycnoY + dep);
      }
      ctx.lineTo(w, bottomY);
      ctx.closePath();
      ctx.fill();

      // Bathymetric Sea Floor
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, bottomY, w, h - bottomY);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, bottomY);
      ctx.lineTo(w, bottomY);
      ctx.stroke();

      // Soliton Vector Arrow
      const arrowX = w / 2 + Math.sin(time * 0.8) * 40;
      ctx.strokeStyle = '#F59E0B';
      ctx.fillStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(arrowX - 25, pycnoY - 20);
      ctx.lineTo(arrowX + 25, pycnoY - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(arrowX + 25, pycnoY - 20);
      ctx.lineTo(arrowX + 17, pycnoY - 24);
      ctx.lineTo(arrowX + 17, pycnoY - 16);
      ctx.closePath();
      ctx.fill();

      // Legend & Math
      ctx.font = '9px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`Upper Layer ρ₁ = 1024 kg/m³`, 20, surfY + 22);
      ctx.fillText(`Abyssal Layer ρ₂ = 1028 kg/m³`, 20, bottomY - 14);
      ctx.fillStyle = '#22D3EE';
      ctx.fillText(`KdV Soliton η₀ = -${solitonAmplitudeM}m`, arrowX - 45, pycnoY - 30);
      ctx.fillStyle = '#FBBF24';
      ctx.fillText(`Phase Speed V = ${solitonPhaseSpeedMs} m/s`, canvas.width - 155, 36);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [solitonAmplitudeM, solitonPhaseSpeedMs, characteristicWidthM]);

  return (
    <div className="relative w-full h-72 rounded-md overflow-hidden border border-[#DDD6C7] bg-[#091824]">
      <canvas ref={canvasRef} width={480} height={288} className="w-full h-full block" />
      <div className="absolute top-2 left-3 text-[10px] font-mono text-[#94A3B8] bg-[#091824]/80 px-2 py-0.5 rounded border border-[#1E293B]">
        3D Ocean Pycnocline Internal Solitary Wave (ISW) Soliton
      </div>
    </div>
  );
};
