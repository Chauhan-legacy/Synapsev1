import React, { useRef, useEffect, useState } from 'react';
import { Share2, RotateCcw, ExternalLink } from 'lucide-react';

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

interface GraphifyNetworkProps {
  onSelectPaper?: (paperId: string) => void;
  selectedPaperId?: string | null;
  height?: number;
}

const INITIAL_NODES: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[] = [
  // Empirical Findings
  {
    id: 'f_higgs',
    label: 'CERN Di-Photon 125.09 GeV',
    type: 'finding',
    category: 'High-Energy Physics',
    formula: 'm_{\\gamma\\gamma} = 125.09\\,\\text{GeV} \\ (5.4\\sigma)',
    description: 'Di-photon invariant mass resonance observed by ATLAS & CMS.',
    radius: 18,
    color: '#0F766E', // Paper Teal
  },
  {
    id: 'f_gw150914',
    label: 'LIGO GW150914 Chirp',
    type: 'finding',
    category: 'Astrophysics & Gravitation',
    formula: 'h(t) \\approx 1.0 \\times 10^{-21}, \\ f_{\\text{merge}} = 250\\,\\text{Hz}',
    description: 'Binary black hole merger gravitational wave strain detected at Hanford & Livingston.',
    radius: 17,
    color: '#0F766E',
  },
  {
    id: 'f_muon',
    label: 'Relativistic Muon Dilation',
    type: 'finding',
    category: 'Relativistic Physics',
    formula: '\\gamma = 28.87, \\ \\tau = 63.42\\,\\mu\\text{s}',
    description: 'Cosmic ray atmospheric muon survival verified at sea level.',
    radius: 16,
    color: '#0F766E',
  },
  {
    id: 'f_chaos',
    label: 'Takens Attractor (λ = +0.42)',
    type: 'finding',
    category: 'Nonlinear Dynamics',
    formula: '\\lambda_1 > 0 \\implies \\text{Deterministic Chaos}',
    description: 'Positive largest Lyapunov exponent from delay-coordinate phase reconstruction.',
    radius: 16,
    color: '#0F766E',
  },
  {
    id: 'f_pelt',
    label: 'PELT Breakpoint at t = 2.6s',
    type: 'finding',
    category: 'Statistical Change',
    formula: '\\min_{\\tau} \\sum [\\mathcal{C}(y) + \\beta]',
    description: 'Optimal linear-time non-stationary regime shift identification.',
    radius: 15,
    color: '#0F766E',
  },

  // Mathematical & Theoretical Foundations
  {
    id: 'm_breit_wigner',
    label: 'Relativistic Breit-Wigner',
    type: 'math',
    category: 'Quantum Mechanics',
    formula: '\\sigma(E) \\propto \\frac{\\Gamma^2}{(E^2 - M^2)^2 + M^2 \\Gamma^2}',
    description: 'Cross-section propagator for unstable quantum resonance states.',
    radius: 15,
    color: '#B45F1B', // Amber
  },
  {
    id: 'm_lorentz',
    label: 'Lorentz Metric & Time Dilation',
    type: 'math',
    category: 'Special Relativity',
    formula: 'ds^2 = -c^2 dt^2 + dx^2 + dy^2 + dz^2',
    description: 'Invariance of spacetime interval across inertial reference frames.',
    radius: 15,
    color: '#B45F1B',
  },
  {
    id: 'm_dpss',
    label: 'Thomson Multitaper DPSS',
    type: 'math',
    category: 'Signal Processing',
    formula: 'v_k^{(n)}(N, W) \\implies \\text{Slepian Prolate Spheroidal}',
    description: 'Optimal spectral leakage suppression using discrete prolate spheroidal sequences.',
    radius: 14,
    color: '#B45F1B',
  },
  {
    id: 'm_attention',
    label: 'Scaled Dot-Product Attention',
    type: 'math',
    category: 'Deep Learning',
    formula: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V',
    description: 'All-to-all sequence transduction mechanism replacing recurrence.',
    radius: 17,
    color: '#B45F1B',
  },

  // Foundational Preprints / Literature Nodes
  {
    id: 'arxiv_1706_03762',
    label: 'Vaswani et al. 2017',
    type: 'paper',
    category: 'Computation & Language',
    arxivId: '1706.03762',
    citations: 136165,
    description: 'Attention Is All You Need — Foundational paper introducing the Transformer.',
    radius: 20,
    color: '#4338CA', // Indigo
  },
  {
    id: 'arxiv_1602_03837',
    label: 'Abbott et al. 2016 (LIGO)',
    type: 'paper',
    category: 'Astrophysics & Gravitation',
    arxivId: '1602.03837',
    citations: 14200,
    description: 'Observation of Gravitational Waves from a Binary Black Hole Merger.',
    radius: 19,
    color: '#4338CA',
  },
  {
    id: 'arxiv_1207_7214',
    label: 'Aad et al. 2012 (ATLAS Higgs)',
    type: 'paper',
    category: 'High Energy Physics',
    arxivId: '1207.7214',
    citations: 18500,
    description: 'Observation of a New Particle in the Search for the Standard Model Higgs Boson.',
    radius: 19,
    color: '#4338CA',
  },
  {
    id: 'arxiv_1802_03456',
    label: 'Thomson et al. (DPSS Multitaper)',
    type: 'paper',
    category: 'Signal Processing',
    arxivId: '1802.03456',
    citations: 142,
    description: 'Multitaper Spectral Analysis of Gravitational Wave & Geophysical Data.',
    radius: 14,
    color: '#4338CA',
  },
  {
    id: 'arxiv_2104_09876',
    label: 'Killick et al. (PELT Break)',
    type: 'paper',
    category: 'Statistics & Time Series',
    arxivId: '2104.09876',
    citations: 188,
    description: 'Change Point Detection in High Dimensional Non-Stationary Time Series via PELT.',
    radius: 14,
    color: '#4338CA',
  },
  {
    id: 'arxiv_2205_11223',
    label: 'Rosenstein et al. (Takens Chaos)',
    type: 'paper',
    category: 'Chaotic Dynamics',
    arxivId: '2205.11223',
    citations: 96,
    description: 'Deterministic Chaos and Phase Space Reconstruction from Single-Channel Time Series.',
    radius: 13,
    color: '#4338CA',
  },
];

const INITIAL_EDGES: GraphEdge[] = [
  { source: 'f_higgs', target: 'm_breit_wigner', weight: 2 },
  { source: 'f_higgs', target: 'arxiv_1207_7214', weight: 3 },
  { source: 'm_breit_wigner', target: 'arxiv_1207_7214', weight: 2 },

  { source: 'f_gw150914', target: 'm_dpss', weight: 2 },
  { source: 'f_gw150914', target: 'arxiv_1602_03837', weight: 3 },
  { source: 'm_dpss', target: 'arxiv_1802_03456', weight: 3 },

  { source: 'f_muon', target: 'm_lorentz', weight: 3 },

  { source: 'f_chaos', target: 'arxiv_2205_11223', weight: 3 },

  { source: 'f_pelt', target: 'arxiv_2104_09876', weight: 3 },

  { source: 'm_attention', target: 'arxiv_1706_03762', weight: 3 },
  { source: 'arxiv_1706_03762', target: 'arxiv_1602_03837', weight: 1 },
];

export const GraphifyNetwork: React.FC<GraphifyNetworkProps> = ({
  onSelectPaper,
  selectedPaperId,
  height = 360,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nodes, setNodes] = useState<GraphNode[]>(() => {
    const w = 700;
    const h = height;
    return INITIAL_NODES.map((n, i) => {
      const angle = (i / INITIAL_NODES.length) * Math.PI * 2;
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

  const [edges] = useState<GraphEdge[]>(INITIAL_EDGES);
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const simulate = () => {
      if (!isRunning) return;

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
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-[#0F766E]" />
          <span className="font-bold text-[#1F2430]">Graphify™ Discovery &amp; Literature Neural Graph</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#E6F4F2] text-[#0F766E] font-bold border border-[#0F766E]/20">
            Interactive Physics DAG
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
          {[
            { id: 'all', label: 'All Nodes' },
            { id: 'finding', label: '● Empirical Findings' },
            { id: 'math', label: '● Mathematical Formulations' },
            { id: 'paper', label: '● ArXiv Preprints' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterType(pill.id)}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
                filterType === pill.id
                  ? 'bg-[#0F766E] text-white font-bold'
                  : 'bg-[#FFFFFF] border border-[#DDD6C7] text-[#57534E] hover:bg-[#EFEBE0]'
              }`}
            >
              {pill.label}
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
