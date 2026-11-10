import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { useAccessibility } from '../../context/AccessibilityContext';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export interface ChartSeries {
  name: string;
  data: number[];
  color?: string;
  unit?: string;
  dashed?: boolean;
}

interface InteractiveChartProps {
  title: string;
  xValues: number[];
  xLabel: string;
  yLabel: string;
  series: ChartSeries[];
  accessibleSummary: string;
  height?: number;
  thresholdY?: number;
  thresholdLabel?: string;
  markerPoints?: Array<{ x: number; y: number; label: string; color?: string }>;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  title,
  xValues,
  xLabel,
  yLabel,
  series,
  accessibleSummary,
  height = 260,
  thresholdY,
  thresholdLabel,
  markerPoints = [],
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { palette, settings } = useAccessibility();

  // Width state from ResizeObserver
  const [width, setWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        setWidth(entries[0].contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Zoom and pan range: [startIndex, endIndex]
  const [range, setRange] = useState<[number, number]>([0, xValues.length - 1]);

  useEffect(() => {
    setRange([0, Math.max(1, xValues.length - 1)]);
  }, [xValues.length]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Decimation for large arrays (> 4000 pts)
  const [startIdx, endIdx] = range;
  const visibleX = useMemo(() => {
    return xValues.slice(startIdx, endIdx + 1);
  }, [xValues, startIdx, endIdx]);

  // Compute extents
  const { minY, maxY, minX, maxX } = useMemo(() => {
    if (visibleX.length === 0) return { minY: 0, maxY: 1, minX: 0, maxX: 1 };
    let y0 = Infinity;
    let y1 = -Infinity;

    series.forEach((s) => {
      const sub = s.data.slice(startIdx, endIdx + 1);
      for (let i = 0; i < sub.length; i++) {
        const v = sub[i];
        if (v < y0) y0 = v;
        if (v > y1) y1 = v;
      }
    });

    if (y0 === Infinity) {
      y0 = 0;
      y1 = 1;
    }
    const pad = (y1 - y0) * 0.08 || 0.1;
    return {
      minY: y0 - pad,
      maxY: y1 + pad,
      minX: visibleX[0],
      maxX: visibleX[visibleX.length - 1],
    };
  }, [visibleX, series, startIdx, endIdx]);

  // Chart padding
  const padding = { top: 24, right: 32, bottom: 36, left: 54 };
  const plotWidth = Math.max(100, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  // Scaling helpers
  const scaleX = useCallback(
    (x: number) => {
      if (maxX === minX) return padding.left;
      return padding.left + ((x - minX) / (maxX - minX)) * plotWidth;
    },
    [minX, maxX, padding.left, plotWidth]
  );

  const scaleY = useCallback(
    (y: number) => {
      if (maxY === minY) return padding.top + plotHeight / 2;
      return padding.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;
    },
    [minY, maxY, padding.top, plotHeight]
  );

  // Downsample to max 1200 points for crisp SVG rendering without frame drops
  const decimateStep = Math.max(1, Math.floor(visibleX.length / 1000));

  // Build SVG path strings
  const paths = useMemo(() => {
    return series.map((s, sIdx) => {
      const sub = s.data.slice(startIdx, endIdx + 1);
      let d = '';
      for (let i = 0; i < visibleX.length; i += decimateStep) {
        const px = scaleX(visibleX[i]);
        const py = scaleY(sub[i]);
        d += (i === 0 ? 'M' : 'L') + `${px.toFixed(1)},${py.toFixed(1)} `;
      }
      const color = s.color || palette[sIdx % palette.length];
      return { d, color, name: s.name, dashed: s.dashed };
    });
  }, [series, startIdx, endIdx, visibleX, decimateStep, scaleX, scaleY, palette]);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;
    const span = endIdx - startIdx;
    const newSpan = Math.max(20, Math.min(xValues.length - 1, Math.round(span * zoomFactor)));
    const center = Math.round((startIdx + endIdx) / 2);
    const newStart = Math.max(0, center - Math.round(newSpan / 2));
    const newEnd = Math.min(xValues.length - 1, newStart + newSpan);
    setRange([newStart, newEnd]);
  };

  const handleResetZoom = () => {
    setRange([0, Math.max(1, xValues.length - 1)]);
  };

  const handleZoomIn = () => {
    const span = endIdx - startIdx;
    const newSpan = Math.max(20, Math.round(span * 0.7));
    const center = Math.round((startIdx + endIdx) / 2);
    const newStart = Math.max(0, center - Math.round(newSpan / 2));
    const newEnd = Math.min(xValues.length - 1, newStart + newSpan);
    setRange([newStart, newEnd]);
  };

  const handleZoomOut = () => {
    const span = endIdx - startIdx;
    const newSpan = Math.min(xValues.length - 1, Math.round(span * 1.4));
    const center = Math.round((startIdx + endIdx) / 2);
    const newStart = Math.max(0, center - Math.round(newSpan / 2));
    const newEnd = Math.min(xValues.length - 1, newStart + newSpan);
    setRange([newStart, newEnd]);
  };

  // Grid tick counts
  const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => minX + frac * (maxX - minX));
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => minY + frac * (maxY - minY));

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div
      ref={containerRef}
      className="relative surface-base border rounded-md p-3 my-2 focus-within:ring-1 focus-within:ring-blue-500"
      aria-label={`${title} chart`}
      role="region"
    >
      <div className="flex items-center justify-between pb-2 mb-1 border-b text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">{title}</span>
          <span className="sr-only">{accessibleSummary}</span>
        </div>
        <div className="flex items-center gap-1.5 no-print">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded surface-subtle text-muted hover:text-primary transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded surface-subtle text-muted hover:text-primary transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded surface-subtle text-muted hover:text-primary transition-colors"
            title="Reset range"
            aria-label="Reset zoom range"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className={`relative cursor-crosshair overflow-hidden rounded ${
          isDark ? 'chart-graticule-dark bg-[#121519]' : 'chart-graticule-light bg-[#fafafa]'
        }`}
        onWheel={handleWheel}
        onDoubleClick={handleResetZoom}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="select-none block"
          onMouseMove={(e) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            const mouseX = e.clientX - rect.left - padding.left;
            const frac = Math.max(0, Math.min(1, mouseX / plotWidth));
            const idx = Math.round(frac * (visibleX.length - 1));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Graticule Grid Lines & Ticks */}
          <g className="grid-lines" stroke={isDark ? '#262d38' : '#e2e8f0'} strokeWidth="1">
            {xTicks.map((xVal, i) => {
              const xPos = scaleX(xVal);
              return (
                <line
                  key={`gx-${i}`}
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={padding.top + plotHeight}
                />
              );
            })}
            {yTicks.map((yVal, i) => {
              const yPos = scaleY(yVal);
              return (
                <line
                  key={`gy-${i}`}
                  x1={padding.left}
                  y1={yPos}
                  x2={padding.left + plotWidth}
                  y2={yPos}
                />
              );
            })}
          </g>

          {/* Threshold Line if provided */}
          {thresholdY !== undefined && (
            <g>
              <line
                x1={padding.left}
                y1={scaleY(thresholdY)}
                x2={padding.left + plotWidth}
                y2={scaleY(thresholdY)}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {thresholdLabel && (
                <text
                  x={padding.left + plotWidth - 4}
                  y={scaleY(thresholdY) - 4}
                  fill="#dc2626"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {thresholdLabel}
                </text>
              )}
            </g>
          )}

          {/* Series Traces */}
          {paths.map((p, idx) => (
            <path
              key={idx}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth="1.6"
              strokeDasharray={p.dashed ? '4 3' : undefined}
            />
          ))}

          {/* Marker Points */}
          {markerPoints.map((m, idx) => {
            const mx = scaleX(m.x);
            const my = scaleY(m.y);
            return (
              <g key={`m-${idx}`}>
                <circle cx={mx} cy={my} r="4" fill={m.color || '#2563eb'} stroke="#ffffff" strokeWidth="1" />
                <text
                  x={mx + 6}
                  y={my - 4}
                  fontSize="10"
                  fontFamily="monospace"
                  fill={isDark ? '#f1f5f9' : '#0f172a'}
                  className="font-medium"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* Hover crosshair and readout */}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleX.length && (
            <g>
              <line
                x1={scaleX(visibleX[hoverIndex])}
                y1={padding.top}
                x2={scaleX(visibleX[hoverIndex])}
                y2={padding.top + plotHeight}
                stroke={isDark ? '#94a3b8' : '#475569'}
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={scaleX(visibleX[hoverIndex])}
                cy={scaleY(series[0]?.data[startIdx + hoverIndex] ?? 0)}
                r="3.5"
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Axis Labels and Values */}
          <g className="axis-text" fontSize="10" fill={isDark ? '#94a3b8' : '#64748b'} fontFamily="monospace">
            {xTicks.map((xVal, i) => (
              <text
                key={`tx-${i}`}
                x={scaleX(xVal)}
                y={padding.top + plotHeight + 16}
                textAnchor="middle"
              >
                {xVal.toFixed(1)}
              </text>
            ))}
            {yTicks.map((yVal, i) => (
              <text
                key={`ty-${i}`}
                x={padding.left - 8}
                y={scaleY(yVal) + 3}
                textAnchor="end"
              >
                {yVal.toFixed(2)}
              </text>
            ))}
            {/* Axis titles */}
            <text
              x={padding.left + plotWidth / 2}
              y={height - 6}
              textAnchor="middle"
              className="font-sans text-[11px] font-medium"
            >
              {xLabel}
            </text>
            <text
              x={-height / 2}
              y={14}
              transform="rotate(-90)"
              textAnchor="middle"
              className="font-sans text-[11px] font-medium"
            >
              {yLabel}
            </text>
          </g>
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 border-t text-[11px] font-mono surface-subtle">
          {paths.map((p, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5" style={{ backgroundColor: p.color }} />
              <span className="text-secondary">{p.name}</span>
            </div>
          ))}
          {hoverIndex !== null && hoverIndex >= 0 && hoverIndex < visibleX.length && (
            <div className="ml-auto flex items-center gap-3 text-primary font-semibold">
              <span>{xLabel}: {visibleX[hoverIndex].toFixed(3)}</span>
              {series.map((s, idx) => (
                <span key={idx}>
                  {s.name}: {s.data[startIdx + hoverIndex]?.toFixed(4)} {s.unit || ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
