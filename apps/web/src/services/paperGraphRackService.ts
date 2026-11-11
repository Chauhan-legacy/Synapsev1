/**
 * PaperGraph Rack & Graphify Testing Session Service
 * Manages multiple sets of staged research papers, allows CSV imports,
 * manual search additions, set creation/deletion, and runs Graphify™ synthesis.
 */

import { ArXivPaper, CURATED_ARXIV_CATALOG } from './arxivService';
import { GraphNode, GraphEdge } from '../components/network/GraphifyNetwork';

export interface PaperGraphSet {
  id: string;
  name: string;
  createdAt: number;
  papers: ArXivPaper[];
  isDefault?: boolean;
  isImplemented?: boolean;
  lastSynthesizedAt?: number;
  stats?: {
    nodeCount: number;
    edgeCount: number;
    clusters: number;
  };
}

const STORAGE_KEY = 'synapse_papergraph_sets_v2';

export function getDefaultPaperGraphSets(): PaperGraphSet[] {
  // Set 1: Foundational Multimessenger Astronomy & Physics
  const set1Papers = CURATED_ARXIV_CATALOG.filter((p) =>
    ['1602.03837', '1404.5667', '1207.7214', '1807.08816', '1802.03456'].includes(p.arxiv_id)
  );

  // Set 2: Deep Learning & Sequence Models
  const set2Papers = CURATED_ARXIV_CATALOG.filter((p) =>
    ['1706.03762', '2205.12345'].includes(p.arxiv_id)
  );

  // Set 3: Nonlinear Dynamics & Statistical Chaos
  const set3Papers = CURATED_ARXIV_CATALOG.filter((p) =>
    ['cond-mat/0703058', '2205.11223', '2104.09876', '2303.04567'].includes(p.arxiv_id)
  );

  return [
    {
      id: 'set_foundational_physics',
      name: 'Set 1: Foundational Multimessenger Physics',
      createdAt: Date.now() - 3600000,
      papers: set1Papers.length > 0 ? set1Papers : CURATED_ARXIV_CATALOG.slice(1, 6),
      isDefault: true,
      isImplemented: true,
      lastSynthesizedAt: Date.now() - 1800000,
      stats: { nodeCount: 16, edgeCount: 22, clusters: 4 },
    },
    {
      id: 'set_deep_learning',
      name: 'Set 2: Deep Learning & Transformers',
      createdAt: Date.now() - 1800000,
      papers: set2Papers.length > 0 ? set2Papers : [CURATED_ARXIV_CATALOG[0]],
      isDefault: true,
      isImplemented: false,
    },
    {
      id: 'set_chaos_nonlinear',
      name: 'Set 3: Nonlinear Dynamics & Chaos Tests',
      createdAt: Date.now() - 900000,
      papers: set3Papers.length > 0 ? set3Papers : CURATED_ARXIV_CATALOG.slice(12, 16),
      isDefault: true,
      isImplemented: false,
    },
  ];
}

export function loadStoredPaperGraphSets(): PaperGraphSet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to defaults
  }
  return getDefaultPaperGraphSets();
}

export function savePaperGraphSets(sets: PaperGraphSet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // Storage quota or private mode
  }
}

/**
 * Synthesizes an interactive Graphify knowledge network from an arbitrary set of papers.
 * Extracts:
 * 1. Paper nodes (sized by citation impact)
 * 2. Mathematical invariant / method nodes
 * 3. Empirical finding nodes
 * 4. Cross-citation, category affinity, and methodological edges
 */
export function synthesizeGraphifyFromPapers(papers: ArXivPaper[]): {
  nodes: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[];
  edges: GraphEdge[];
  stats: { nodeCount: number; edgeCount: number; clusters: number };
} {
  const nodes: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[] = [];
  const edges: GraphEdge[] = [];
  const addedNodeIds = new Set<string>();

  // 1. Add all Paper nodes
  papers.forEach((paper) => {
    if (addedNodeIds.has(paper.id)) return;
    addedNodeIds.add(paper.id);

    const firstAuthor = paper.authors[0] ? paper.authors[0].split(' ').pop() : 'Author';
    const label = `${firstAuthor} et al. (${paper.year})`;
    const citations = paper.citationCount || 50;
    // Radius: log-scaled between 14 and 24
    const radius = Math.min(24, Math.max(14, Math.round(12 + Math.log10(Math.max(10, citations)) * 2.5)));

    // Categorize color
    let color = '#4338CA'; // Indigo default for papers
    if (paper.category.includes('cs') || paper.category.includes('Language')) color = '#2563EB'; // Blue
    if (paper.category.includes('gr-qc') || paper.category.includes('astro')) color = '#0F766E'; // Teal
    if (paper.category.includes('hep') || paper.category.includes('nucl')) color = '#7C3AED'; // Purple
    if (paper.category.includes('nlin') || paper.category.includes('stat')) color = '#D97706'; // Amber

    nodes.push({
      id: paper.id,
      label,
      type: 'paper',
      category: paper.category.split(' ')[0] || 'Scientific Pre-print',
      citations,
      arxivId: paper.arxiv_id,
      description: `${paper.title} — ${paper.abstract.slice(0, 160)}...`,
      radius,
      color,
    });
  });

  // 2. Discover / Synthesize Mathematical Method Nodes
  const methodMap: Record<string, { id: string; label: string; formula: string; category: string; description: string }> = {
    attention: {
      id: 'm_attention',
      label: 'Multi-Head Self-Attention',
      formula: '\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right) V',
      category: 'Sequence Models',
      description: 'Scaled dot-product token routing replacing recurrence.',
    },
    multitaper: {
      id: 'm_dpss',
      label: 'Thomson Multitaper DPSS',
      formula: 'v_k^{(n)}(N, W) \\implies \\text{Discrete Prolate Spheroidal}',
      category: 'Spectral Estimation',
      description: 'Orthogonal Slepian tapers achieving optimal variance reduction.',
    },
    pelt: {
      id: 'm_pelt',
      label: 'PELT Change-Point',
      formula: '\\min_{\\tau} \\sum_{i=1}^m \\left[\\mathcal{C}(y_{\\tau_{i-1}:\\tau_i}) + \\beta\\right]',
      category: 'Time Series Detection',
      description: 'Pruned exact linear time dynamic programming for regime shifts.',
    },
    takens: {
      id: 'm_takens',
      label: 'Takens Delay Embedding',
      formula: '\\mathbf{x}(t) = \\left[s(t), s(t+\\tau), \\dots, s(t+(m-1)\\tau)\\right]',
      category: 'Nonlinear Dynamics',
      description: 'Topological phase space reconstruction from scalar time series.',
    },
    monte_carlo: {
      id: 'm_ising',
      label: 'Metropolis-Hastings Monte Carlo',
      formula: 'P(\\text{accept}) = \\min\\left(1, e^{-\\Delta E / k_B T}\\right)',
      category: 'Statistical Mechanics',
      description: 'Importance sampling for 2D Ising lattice magnetization and critical exponents.',
    },
    transit: {
      id: 'm_transit',
      label: 'Mandel-Agol Limb Darkening',
      formula: 'I(\\mu) = 1 - u_1(1-\\mu) - u_2(1-\\mu)^2',
      category: 'Exoplanet Photometry',
      description: 'Quadratic stellar limb darkening geometry for exoplanet transit dips.',
    },
    lorentz: {
      id: 'm_lorentz',
      label: 'Lorentz Time Dilation',
      formula: '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}, \\quad \\tau = \\gamma \\tau_0',
      category: 'Relativistic Mechanics',
      description: 'Einstein relativistic kinematic invariant for cosmic muons.',
    },
    quiroga: {
      id: 'm_quiroga',
      label: 'Quiroga Non-Parametric Noise',
      formula: '\\sigma_n = \\text{median}\\left(\\frac{|x|}{0.6745}\\right)',
      category: 'Electrophysiology',
      description: 'Robust thresholding for extracellular spike detection.',
    },
  };

  // Inspect papers and link to relevant methods
  papers.forEach((paper) => {
    const text = `${paper.title} ${paper.abstract} ${paper.methodology || ''}`.toLowerCase();

    Object.entries(methodMap).forEach(([keyword, m]) => {
      let matched = false;
      if (keyword === 'attention' && (text.includes('attention') || text.includes('transformer'))) matched = true;
      if (keyword === 'multitaper' && (text.includes('multitaper') || text.includes('dpss') || text.includes('slepian') || text.includes('spectral'))) matched = true;
      if (keyword === 'pelt' && (text.includes('pelt') || text.includes('change-point') || text.includes('structural break'))) matched = true;
      if (keyword === 'takens' && (text.includes('takens') || text.includes('lyapunov') || text.includes('chaos') || text.includes('attractor'))) matched = true;
      if (keyword === 'monte_carlo' && (text.includes('ising') || text.includes('monte carlo') || text.includes('spin'))) matched = true;
      if (keyword === 'transit' && (text.includes('transit') || text.includes('kepler') || text.includes('exoplanet') || text.includes('photometry'))) matched = true;
      if (keyword === 'lorentz' && (text.includes('lorentz') || text.includes('dilation') || text.includes('relativity') || text.includes('muon'))) matched = true;
      if (keyword === 'quiroga' && (text.includes('quiroga') || text.includes('spike') || text.includes('action potential') || text.includes('eeg'))) matched = true;

      if (matched) {
        if (!addedNodeIds.has(m.id)) {
          addedNodeIds.add(m.id);
          nodes.push({
            id: m.id,
            label: m.label,
            type: 'math',
            category: m.category,
            formula: m.formula,
            description: m.description,
            radius: 16,
            color: '#B45F1B', // Amber
          });
        }
        edges.push({
          source: paper.id,
          target: m.id,
          label: 'Formulation',
          weight: 2,
        });
      }
    });
  });

  // 3. Connect Cross-Citations and Thematic Clusters between papers
  const categoryGroups: Record<string, string[]> = {};
  papers.forEach((p) => {
    const cat = p.category.split(' ')[0] || 'General';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(p.id);
  });

  // Cross-link papers in same category
  Object.values(categoryGroups).forEach((paperIds) => {
    for (let i = 0; i < paperIds.length; i++) {
      for (let j = i + 1; j < paperIds.length; j++) {
        edges.push({
          source: paperIds[i],
          target: paperIds[j],
          label: 'Thematic Link',
          weight: 1,
        });
      }
    }
  });

  // If there are isolated papers, connect them to the most prominent node to avoid floating disconnected islands
  const connectedNodes = new Set<string>();
  edges.forEach((e) => {
    connectedNodes.add(e.source);
    connectedNodes.add(e.target);
  });

  if (papers.length > 1) {
    const hubPaper = papers[0];
    papers.slice(1).forEach((p) => {
      if (!connectedNodes.has(p.id)) {
        edges.push({
          source: hubPaper.id,
          target: p.id,
          label: 'Citation Affinity',
          weight: 1,
        });
      }
    });
  }

  const clusters = Object.keys(categoryGroups).length;

  return {
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      clusters: Math.max(1, clusters),
    },
  };
}
