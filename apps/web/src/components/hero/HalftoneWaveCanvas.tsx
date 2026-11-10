import React, { useRef, useEffect } from 'react';

interface HalftoneWaveCanvasProps {
  className?: string;
}

export const HalftoneWaveCanvas: React.FC<HalftoneWaveCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const spacing = 26; // Refined scientific graticule dot matrix
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width * 0.55;
      const centerY = height * 0.50;
      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Subtle harmonic wave interference (no neon pub glow)
          const wave1 = Math.sin(x * 0.005 + y * 0.004 + time * 0.001);
          const wave2 = Math.cos(dist * 0.008 - angle * 2.0 - time * 0.0012);
          const composite = (wave1 * 0.55 + wave2 * 0.45);
          const norm = (composite + 1) * 0.5;

          const maxDist = Math.max(width, height) * 0.8;
          const radialFade = Math.max(0, 1 - dist / maxDist);

          // Fine academic pen-dot matrix in neutral slate/ink and warm amber
          const radius = Math.max(0.6, norm * 2.5 * (0.4 + radialFade * 0.6));
          const opacity = Math.min(0.65, Math.max(0.04, norm * radialFade * 0.7));

          if (radius > 0.4 && opacity > 0.03) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);

            if (norm > 0.7) {
              // Warm amber subtle accent
              ctx.fillStyle = `rgba(180, 95, 27, ${opacity * 0.85})`;
            } else if (norm > 0.4) {
              // Deep ink dot
              ctx.fillStyle = `rgba(16, 20, 28, ${opacity * 0.65})`;
            } else {
              // Warm stone graticule dot
              ctx.fillStyle = `rgba(120, 113, 108, ${opacity * 0.45})`;
            }
            ctx.fill();
          }
        }
      }

      if (!prefersReducedMotion) {
        time += 16;
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none select-none ${className}`}
      aria-hidden="true"
    />
  );
};
