import React, { useRef, useEffect, useState } from 'react';
import { Share2, RotateCcw, ExternalLink, Layers } from 'lucide-react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'finding' | 'math' | 'paper' | 'invariant';
  category: string;
  citations?: number;
  arxivId?: string;
  formula?: string;
  description: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  weight: number;
}

export interface GraphifyNetworkProps {
  onSelectPaper?: (paperId: string) => void;
  selectedPaperId?: string | null;
  height?: number;
  customNodes?: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[];
  customEdges?: GraphEdge[];
  sessionLabel?: string;
  onOpenRack?: () => void;
  stagedCount?: number;
}

export const GraphifyNetwork: React.FC<GraphifyNetworkProps> = ({
  onSelectPaper,
  selectedPaperId,
  height = 360,
  customNodes,
  customEdges,
  sessionLabel,
  onOpenRack,
  stagedCount = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>(() => {
    const sourceNodes = (customNodes && customNodes.length > 0) ? customNodes : [];
    if (sourceNodes.length === 0) return [];
    const w = 700;
    const h = height;
    return sourceNodes.map((n, i) => {
      const angle = (i / sourceNodes.length) * Math.PI * 2;
      const radius = 120 + (i % 3) * 60;
      return {
        ...n,
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      };
    });
  });

  const [edges, setEdges] = useState<GraphEdge[]>(() => {
    return (customEdges && customEdges.length > 0) ? customEdges : [];
  });

  // Re-synchronize when customNodes or customEdges change (e.g. from "Implement Graphify")
  useEffect(() => {
    const sourceNodes = (customNodes && customNodes.length > 0) ? customNodes : [];
    const sourceEdges = (customEdges && customEdges.length > 0) ? customEdges : [];
    if (sourceNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const w = 760;
    const h = height;

    const initialized = sourceNodes.map((n, i) => {
      const angle = (i / sourceNodes.length) * Math.PI * 2;
      const radius = 125 + (i % 3) * 55;
      return {
        ...n,
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      };
    });

    setNodes(initialized);
    setEdges(sourceEdges);
  }, [customNodes, customEdges, height]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(selectedPaperId || null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const draggedNodeRef = useRef<GraphNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pulsesRef = useRef<{ edgeIdx: number; progress: number }[]>([]);

  // Keep selected paper synchronized from outside
  useEffect(() => {
    if (selectedPaperId) {
      setSelectedNodeId(selectedPaperId);
    }
  }, [selectedPaperId]);

  // Force simulation loop
  useEffect(() => {
    if (nodes.length === 0) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const simulate = () => {
      if (!isRunning || nodes.length === 0) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      setNodes((prevNodes) => {
        const nextNodes = prevNodes.map((n) => ({ ...n }));
        const nodeMap = new Map(nextNodes.map((n) => [n.id, n]));

        // 1. Center Gravity
        for (const n of nextNodes) {
          if (draggedNodeRef.current?.id === n.id) continue;
          n.vx += (centerX - n.x) * 0.0006;
          n.vy += (centerY - n.y) * 0.0006;
        }

        // 2. Coulomb Repulsion between all node pairs
        for (let i = 0; i < nextNodes.length; i++) {
          for (let j = i + 1; j < nextNodes.length; j++) {
            const a = nextNodes[i];
            const b = nextNodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            const force = (3200 / distSq);

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (draggedNodeRef.current?.id !== a.id) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (draggedNodeRef.current?.id !== b.id) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }

        // 3. Hooke Spring Attraction along edges
        for (const e of edges) {
          const a = nodeMap.get(e.source);
          const b = nodeMap.get(e.target);
          if (!a || !b) continue;

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 110;
          const springForce = (dist - targetDist) * 0.008 * e.weight;

          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          if (draggedNodeRef.current?.id !== a.id) {
            a.vx += fx;
            a.vy += fy;
          }
          if (draggedNodeRef.current?.id !== b.id) {
            b.vx -= fx;
            b.vy -= fy;
          }
        }

        // 4. Dampen velocity and integrate position
        for (const n of nextNodes) {
          if (draggedNodeRef.current?.id === n.id) continue;
          n.vx *= 0.88;
          n.vy *= 0.88;
          n.x += n.vx;
          n.y += n.vy;

          // Boundary walls
          const margin = n.radius + 10;
          if (n.x < margin) { n.x = margin; n.vx *= -0.5; }
          if (n.x > width - margin) { n.x = width - margin; n.vx *= -0.5; }
          if (n.y < margin) { n.y = margin; n.vy *= -0.5; }
          if (n.y > height - margin) { n.y = height - margin; n.vy *= -0.5; }
        }

        return nextNodes;
      });

      // Advance particles along edges
      if (Math.random() < 0.12) {
        pulsesRef.current.push({
          edgeIdx: Math.floor(Math.random() * edges.length),
          progress: 0,
        });
      }
      pulsesRef.current = pulsesRef.current
        .map((p) => ({ ...p, progress: p.progress + 0.02 }))
        .filter((p) => p.progress < 1.0);

      animFrameRef.current = requestAnimationFrame(simulate);
    };

    animFrameRef.current = requestAnimationFrame(simulate);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [edges]);

  // Drawing Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    ctx.clearRect(0, 0, width, height);

    // Subtle Paper Background Grid
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, width, height);

    if (nodes.length === 0) {
      return; // Clean plain page - no animations or dummy nodes
    }

    ctx.strokeStyle = '#F1ECE1';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Edges
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) continue;

      const isConnected =
        selectedNodeId === a.id ||
        selectedNodeId === b.id ||
        hoveredNodeId === a.id ||
        hoveredNodeId === b.id;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);

      if (isConnected) {
        ctx.strokeStyle = '#0F766E';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#DDD6C7';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Flowing Pulses along Edges
    for (const pulse of pulsesRef.current) {
      const e = edges[pulse.edgeIdx];
      if (!e) continue;
      const a = nodeMap.get(e.source);
      const b = nodeMap.get(e.target);
      if (!a || !b) continue;

      const px = a.x + (b.x - a.x) * pulse.progress;
      const py = a.y + (b.y - a.y) * pulse.progress;

      ctx.fillStyle = '#0F766E';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Nodes
    for (const n of nodes) {
      const isSelected = selectedNodeId === n.id;
      const isHovered = hoveredNodeId === n.id;
      const isFilteredOut = filterType !== 'all' && n.type !== filterType;

      ctx.save();
      ctx.globalAlpha = isFilteredOut ? 0.25 : 1.0;

      // Outer Glow for Selected / Hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(15, 118, 110, 0.2)' : 'rgba(180, 95, 27, 0.15)';
        ctx.fill();
      }

      // Circle Body
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.fill();

      ctx.lineWidth = isSelected ? 3 : 1.5;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Node Icon / Type Badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const typeGlyph = n.type === 'finding' ? 'E' : n.type === 'math' ? '∫' : '§';
      ctx.fillText(typeGlyph, n.x, n.y);

      // Label Below Node
      ctx.font = isSelected ? 'bold 11px JetBrains Mono, monospace' : '10px JetBrains Mono, monospace';
      ctx.fillStyle = isSelected ? '#0F766E' : '#1F2430';
      ctx.fillText(n.label, n.x, n.y + n.radius + 12);

      ctx.restore();
    }
  }, [nodes, edges, selectedNodeId, hoveredNodeId, filterType]);

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    for (const n of nodes) {
      const dist = Math.hypot(n.x - mx, n.y - my);
      if (dist <= n.radius + 5) {
        draggedNodeRef.current = n;
        setSelectedNodeId(n.id);
        if (n.type === 'paper' && onSelectPaper) {
          onSelectPaper(n.id);
        }
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = mx;
      draggedNodeRef.current.y = my;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
    } else {
      let found: string | null = null;
      for (const n of nodes) {
        if (Math.hypot(n.x - mx, n.y - my) <= n.radius + 5) {
          found = n.id;
          break;
        }
      }
      setHoveredNodeId(found);
    }
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl shadow-xs overflow-hidden font-mono text-xs">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF8F5] border-b border-[#DDD6C7]">
        <div className="flex flex-wrap items-center gap-2">
          <Share2 className="w-4 h-4 text-[#0F766E]" />
          <span className="font-bold text-[#1F2430]">Graphify™ Literature Network</span>
          {sessionLabel ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-bold border border-[#F59E0B]/30 truncate max-w-[200px]" title={sessionLabel}>
              {sessionLabel}
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold border border-[#0F766E]/20">
              Interactive Physics DAG
            </span>
          )}
          {onOpenRack && (
            <button
              type="button"
              onClick={onOpenRack}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#0F766E] text-white hover:bg-[#0D655E] text-[10px] font-bold shadow-2xs transition-all ml-1"
            >
              <Layers className="w-3 h-3" />
              <span>PaperGraph Rack ({stagedCount})</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
          {[
            { id: 'all', label: 'All Nodes', dotColor: 'bg-[#1F2430]' },
            { id: 'finding', label: 'Empirical Findings', dotColor: 'bg-[#0F766E]' },
            { id: 'math', label: 'Mathematical Formulations', dotColor: 'bg-[#B45F1B]' },
            { id: 'paper', label: 'arXiv Preprints', dotColor: 'bg-[#4338CA]' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors whitespace-nowrap ${
                filterType === pill.id
                  ? 'bg-[#0F766E] text-white font-bold'
                  : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
              }`}
            >
              {pill.id !== 'all' && (
                <span className={`w-1.5 h-1.5 rounded-full ${filterType === pill.id ? 'bg-white' : pill.dotColor}`} />
              )}
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={760}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-auto cursor-grab active:cursor-grabbing block"
        />

        {/* Clean Plain Page Empty State */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#FFFDF9] z-10 select-none">
            <div className="max-w-md p-6 rounded-xl border border-[#E6E1D6] bg-white shadow-xs space-y-3 font-mono">
              <div className="w-10 h-10 mx-auto rounded-full bg-[#FAF8F5] border border-[#DDD6C7] flex items-center justify-center text-[#0F766E]">
                <Layers className="w-5 h-5 text-[#0F766E]" />
              </div>
              <h3 className="font-serif italic font-bold text-base text-[#1F2430]">
                Clean Slate • No Staged Literature
              </h3>
              <p className="text-xs text-[#6B6F7B] leading-relaxed">
                Active testing set has no staged papers. Upload a research CSV or add papers from literature search, then run <strong>Implement Graphify™</strong> to synthesize the citation DAG.
              </p>
            </div>
          </div>
        )}

        {/* Canvas Controls Overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#FFFFFF]/90 backdrop-blur-xs p-1 rounded-lg border border-[#DDD6C7] shadow-xs">
          <button
            type="button"
            onClick={() => {
              setNodes((prev) =>
                prev.map((n) => ({
                  ...n,
                  x: 380 + (Math.random() - 0.5) * 200,
                  y: height / 2 + (Math.random() - 0.5) * 160,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                }))
              );
            }}
            title="Re-shake simulation"
            className="p-1.5 text-[#57534E] hover:text-[#1F2430] hover:bg-[#EFEBE0] rounded"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selected Node Inspector Footer */}
      {selectedNode && (
        <div className="p-3 bg-[#FAF8F5] border-t border-[#DDD6C7] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              />
              <span className="font-bold text-[#1F2430]">{selectedNode.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EFEBE0] text-[#57534E]">
                {selectedNode.category}
              </span>
              {selectedNode.citations && (
                <span className="text-[10px] text-[#0F766E] font-bold">
                  {selectedNode.citations.toLocaleString()} citations
                </span>
              )}
            </div>
            <p className="text-[#6B6F7B] text-[11px]">{selectedNode.description}</p>
            {selectedNode.formula && (
              <div className="text-[11px] text-[#0F766E] font-bold">
                Formula: {selectedNode.formula}
              </div>
            )}
          </div>

          {selectedNode.arxivId && (
            <a
              href={`https://arxiv.org/abs/${selectedNode.arxivId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] text-white hover:bg-[#0D655E] font-bold transition-colors shadow-2xs whitespace-nowrap self-start md:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open on arXiv ({selectedNode.arxivId})</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

