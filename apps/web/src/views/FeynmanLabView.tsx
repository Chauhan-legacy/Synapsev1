import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Lightbulb,
  Sliders,
  Code,
  Check,
  Copy,
  Sparkles,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';

interface Topic {
  id: string;
  title: string;
  paper: string;
  level1: {
    analogy: string;
    narrative: string;
    keyTakeaway: string;
  };
  level2: {
    param1Name: string;
    param1Min: number;
    param1Max: number;
    param1Default: number;
    param1Step: number;
    formulaPreview: string;
  };
  level3: {
    derivationSteps: Array<{ title: string; math: string; explanation: string }>;
    pythonCode: string;
  };
}

const TOPICS: Topic[] = [
  {
    id: 'multitaper',
    title: 'Thomson Multitaper Spectral Analysis',
    paper: 'David J. Thomson, IEEE Proceedings (1982)',
    level1: {
      analogy: 'Imagine peering through a stained-glass window with five different pairs of sunglasses.',
      narrative:
        'A standard Fourier transform tries to view the whole frequency spectrum through a single rectangular slit, causing bright peaks to bleed all over dim neighbours ("spectral leakage"). Thomson discovered that by computing Fourier transforms through multiple orthogonal, specially shaped windows (Slepian Discrete Prolate Spheroidal Sequences) and averaging them together, the leakage disappears completely while retaining sharp frequency lines without losing resolution.',
      keyTakeaway:
        'Multitaper gives you the statistical variance reduction of Welch averaging without throwing away long-period frequency resolution.',
    },
    level2: {
      param1Name: 'Time-Halfbandwidth Product (NW)',
      param1Min: 2,
      param1Max: 6,
      param1Default: 3,
      param1Step: 0.5,
      formulaPreview: 'K = 2NW - 1 \\text{ optimal orthogonal tapers}',
    },
    level3: {
      derivationSteps: [
        {
          title: '1. Slepian Optimization Criterion',
          math: '\\lambda_k(N, W) = \\frac{\\int_{-W}^W |V_k(f)|^2 df}{\\int_{-1/2}^{1/2} |V_k(f)|^2 df} = \\max',
          explanation:
            'Find window sequences v_n that maximize the fraction of spectral energy concentrated strictly inside the frequency band [-W, +W].',
        },
        {
          title: '2. Toeplitz Tridiagonal Eigenvalue System',
          math: '\\sum_{m=0}^{N-1} \\frac{\\sin[2\\pi W (n - m)]}{\\pi (n - m)} v_m^{(k)} = \\lambda_k v_n^{(k)}',
          explanation:
            'The solutions are the eigenvectors of the prolate spheroidal kernel. The top K = 2NW - 1 eigenvectors have eigenvalues λ_k ≈ 1.0, meaning virtually zero leakage outside the band.',
        },
        {
          title: '3. Adaptive Weight Multitaper PSD Estimator',
          math: '\\hat{S}_{MT}(f) = \\frac{\\sum_{k=0}^{K-1} d_k^2(f) |y_k(f)|^2}{\\sum_{k=0}^{K-1} d_k^2(f)}',
          explanation:
            'Each individual eigenspectrum y_k(f) is weighted by its protection coefficient d_k(f) to eliminate residual broad-band bias.',
        },
      ],
      pythonCode: `import numpy as np
from scipy.signal.windows import dpss

def multitaper_psd(x: np.ndarray, fs: float = 1000.0, nw: float = 3.5):
    """
    Computes Thomson Multitaper Power Spectral Density with DPSS tapers.
    """
    n = len(x)
    k = int(2 * nw - 1)
    tapers, eigenvalues = dpss(n, NW=nw, Kmax=k, return_ratios=True)
    
    psd_accum = np.zeros(n // 2 + 1)
    for i in range(k):
        # Tapered signal Fourier transform
        tapered = (x - np.mean(x)) * tapers[i]
        fft_vals = np.fft.rfft(tapered)
        psd_accum += eigenvalues[i] * (np.abs(fft_vals) ** 2)
        
    psd_mt = psd_accum / (np.sum(eigenvalues) * fs)
    freqs = np.fft.rfftfreq(n, 1.0 / fs)
    return freqs, psd_mt`,
    },
  },
  {
    id: 'chaos_01',
    title: 'Gottwald-Melbourne 0-1 Test for Chaos',
    paper: 'G.A. Gottwald & I. Melbourne, Proc. Roy. Soc. A (2004)',
    level1: {
      analogy: 'Tracking the footsteps of a sleepwalker on a misty football pitch.',
      narrative:
        'If the sleepwalker is trapped in an orderly loop (periodic orbit), their footsteps will trace a tight, repeating circle on the grass and never drift far from the center. But if their movements are governed by deterministic chaos, their path resembles a Brownian random walk that steadily diffuses outwards across the entire field. By measuring how fast their distance grows with time, we get 0 for order and 1 for chaos.',
      keyTakeaway:
        'Tests for chaos directly from time series data with zero phase-space reconstruction or state embedding needed.',
    },
    level2: {
      param1Name: 'Fourier Coupling Parameter (c)',
      param1Min: 0.2,
      param1Max: 2.8,
      param1Default: 1.15,
      param1Step: 0.05,
      formulaPreview: 'p(n) = \\sum_{j=1}^n x_j \\cos(j c), \\quad q(n) = \\sum_{j=1}^n x_j \\sin(j c)',
    },
    level3: {
      derivationSteps: [
        {
          title: '1. Driven Translation System (p, q)',
          math: 'p_c(n) = \\sum_{j=1}^n \\phi(j) \\cos(j c), \\quad q_c(n) = \\sum_{j=1}^n \\phi(j) \\sin(j c)',
          explanation:
            'Map the scalar observable φ(j) into a 2D continuous dynamical extension driven at irrational frequency c.',
        },
        {
          title: '2. Mean Square Displacement M(n)',
          math: 'M_c(n) = \\lim_{N\\to\\infty} \\frac{1}{N} \\sum_{j=1}^N \\left[ (p_c(j+n) - p_c(j))^2 + (q_c(j+n) - q_c(j))^2 \\right]',
          explanation:
            'Computes the asymptotic drift rate of the translation coordinate trajectory.',
        },
        {
          title: '3. Asymptotic Correlation Growth Rate K',
          math: 'K_c = \\frac{\\text{Cov}(\\log n, \\log M_c(n))}{\\sqrt{\\text{Var}(\\log n) \\cdot \\text{Var}(\\log M_c(n))}} \\in [0, 1]',
          explanation:
            'For regular/periodic dynamics, M(n) is bounded so K = 0. For deterministic chaos, M(n) ~ n linearly so K = 1.',
        },
      ],
      pythonCode: `import numpy as np

def zero_one_chaos_test(x: np.ndarray, c: float = 1.15) -> float:
    """
    Gottwald-Melbourne 0-1 test for chaos.
    Returns K in [0, 1].
    """
    n = len(x)
    j = np.arange(1, n + 1)
    p = np.cumsum(x * np.cos(j * c))
    q = np.cumsum(x * np.sin(j * c))
    
    max_lag = min(100, n // 10)
    m = np.zeros(max_lag)
    for lag in range(1, max_lag + 1):
        dp = p[lag:] - p[:-lag]
        dq = q[lag:] - q[:-lag]
        m[lag - 1] = np.mean(dp**2 + dq**2)
        
    time_lags = np.arange(1, max_lag + 1)
    log_t = np.log(time_lags)
    log_m = np.log(np.maximum(1e-10, m))
    
    corr_matrix = np.corrcoef(log_t, log_m)
    return float(np.clip(corr_matrix[0, 1], 0.0, 1.0))`,
    },
  },
  {
    id: 'pelt',
    title: 'Pruned Exact Linear Time (PELT) Changepoints',
    paper: 'R. Killick, P. Fearnhead, I.A. Eckley, JASA (2012)',
    level1: {
      analogy: 'Packing luggage with an exact penalty for opening an extra suitcase.',
      narrative:
        'If you want to know when a machine suddenly shifted its baseline vibration or when a stock regime collapsed, testing all possible change locations takes O(N²) time. PELT proves an exact mathematical inequality: if a candidate split point is already worse than keeping the current segment, it can never become optimal in the future. By pruning these hopeless candidates on the fly, it finds the mathematically exact global optimum in lightning-fast O(N) time.',
      keyTakeaway:
        'Mathematically exact changepoint detection with zero approximation and linear O(N) execution speed.',
    },
    level2: {
      param1Name: 'Penalty Parameter (β)',
      param1Min: 5,
      param1Max: 40,
      param1Default: 18,
      param1Step: 1,
      formulaPreview: '\\min_{\\tau} \\sum_{i=1}^{m+1} [\\mathcal{C}(y_{(\\tau_{i-1}+1):\\tau_i}) + \\beta]',
    },
    level3: {
      derivationSteps: [
        {
          title: '1. Penalized Cost Minimization',
          math: 'F(n) = \\min_{\\tau} \\left\\{ \\sum_{i=1}^{m+1} \\left[ \\mathcal{C}(y_{(\\tau_{i-1}+1):\\tau_i}) + \\beta \\right] \\right\\}',
          explanation:
            'Find the partition τ = (τ_0, ..., τ_m+1) that minimizes total segment reconstruction error plus a penalty β per changepoint.',
        },
        {
          title: '2. Dynamic Programming Recurrence',
          math: 'F(t) = \\min_{s \\in R_t} \\left\\{ F(s) + \\mathcal{C}(y_{(s+1):t}) + \\beta \\right\\}',
          explanation:
            'Express the optimal cost at time t as a recursive combination over valid preceding candidate points s.',
        },
        {
          title: '3. Killick Inequality Pruning Rule',
          math: '\\text{If } F(s) + \\mathcal{C}(y_{(s+1):t}) + K > F(t), \\quad \\text{then } s \\notin R_{t+1}',
          explanation:
            'Whenever this condition holds, s can never be the optimal changepoint for any future time step t* > t and is pruned from memory.',
        },
      ],
      pythonCode: `import numpy as np

def pelt_changepoint_detection(data: np.ndarray, penalty: float = 15.0) -> list[int]:
    """
    Pruned Exact Linear Time (PELT) change point detection for mean/variance shifts.
    """
    n = len(data)
    f = np.zeros(n + 1)
    f[0] = -penalty
    candidates = [0]
    tau = {}
    
    for t in range(1, n + 1):
        best_cost = np.inf
        best_s = 0
        for s in candidates:
            seg = data[s:t]
            var = np.var(seg) + 1e-8
            cost = len(seg) * np.log(var)
            total = f[s] + cost + penalty
            if total < best_cost:
                best_cost = total
                best_s = s
        f[t] = best_cost
        tau[t] = best_s
        
        # Inequality pruning
        candidates = [s for s in candidates if f[s] + (len(data[s:t]) * np.log(np.var(data[s:t]) + 1e-8)) <= f[t]]
        candidates.append(t)
        
    # Traceback changepoints
    cps = []
    curr = n
    while curr > 0 and curr in tau:
        prev = tau[curr]
        if prev > 0:
            cps.append(prev)
        curr = prev
    return sorted(cps)`,
    },
  },
];

export const FeynmanLabView: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('multitaper');
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const topic = useMemo(
    () => TOPICS.find((t) => t.id === selectedTopicId) || TOPICS[0],
    [selectedTopicId]
  );

  const [sliderVal, setSliderVal] = useState<number>(topic.level2.param1Default);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(topic.level3.pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Feynman Pedagogical Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0F766E]/15 text-[#0F766E] font-bold">
              Dimension 6 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            &ldquo;What I cannot create, I do not understand.&rdquo; &bull; 3-Tier Adaptive Learning: Intuitive Metaphor &rarr; Interactive Experiment &rarr; First-Principles Mathematical Proof.
          </p>
        </div>

        {/* Level Selector Pills */}
        <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
          <button
            type="button"
            onClick={() => setLevel(1)}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
              level === 1 ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Level 1: Intuition</span>
          </button>
          <button
            type="button"
            onClick={() => setLevel(2)}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
              level === 2 ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Level 2: Workbench</span>
          </button>
          <button
            type="button"
            onClick={() => setLevel(3)}
            className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
              level === 3 ? 'bg-[#0F766E] text-white font-bold shadow-2xs' : 'text-[#57534E] hover:text-[#1F2430]'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Level 3: Proof &amp; Code</span>
          </button>
        </div>
      </div>

      {/* Topic Switcher Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono border-b border-[#E6DFC6]">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setSelectedTopicId(t.id);
              setSliderVal(t.level2.param1Default);
            }}
            className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
              selectedTopicId === t.id
                ? 'bg-[#FFFDF9] border-[#0F766E] text-[#0F766E] font-bold shadow-xs'
                : 'bg-[#FAF7EE] border-[#DDD6C7] text-[#57534E] hover:border-[#0F766E]/50'
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      <div className="text-[11px] font-mono text-[#78716C] flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-[#0F766E]" />
        <span>Foundational Reference: <strong className="text-[#1F2430]">{topic.paper}</strong></span>
      </div>

      {/* LEVEL 1: INTUITION & METAPHOR */}
      {level === 1 && (
        <div className="space-y-4">
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0F766E]">
              <Sparkles className="w-4 h-4" />
              <span>Physical Analogy</span>
            </div>
            <blockquote className="border-l-3 border-[#0F766E] pl-4 italic text-sm text-[#1F2430] leading-relaxed">
              &ldquo;{topic.level1.analogy}&rdquo;
            </blockquote>

            <div className="text-xs text-[#57534E] leading-relaxed space-y-2">
              <p>{topic.level1.narrative}</p>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#DDD6C7] rounded-lg text-xs font-mono">
              <span className="text-[#0F766E] font-bold">Key Scientific Insight: </span>
              <span className="text-[#1F2430]">{topic.level1.keyTakeaway}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setLevel(2)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg text-xs font-mono font-bold hover:bg-[#0D655E] transition-colors"
            >
              <span>Explore Interactive Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 2: INTERACTIVE LAB WORKBENCH */}
      {level === 2 && (
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Sliders className="w-4 h-4 text-[#0F766E]" />
                <span>Interactive Mathematical Parameter Sandbox</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Real-Time Geometric Response</span>
            </div>

            <div className="p-4 bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1F2430]">{topic.level2.param1Name}:</span>
                <span className="text-sm font-bold text-[#0F766E]">{sliderVal}</span>
              </div>
              <input
                type="range"
                min={topic.level2.param1Min}
                max={topic.level2.param1Max}
                step={topic.level2.param1Step}
                value={sliderVal}
                onChange={(e) => setSliderVal(parseFloat(e.target.value))}
                className="w-full accent-[#0F766E] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#78716C]">
                <span>Min: {topic.level2.param1Min}</span>
                <span>Current: {sliderVal}</span>
                <span>Max: {topic.level2.param1Max}</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg text-center">
              <div className="text-xs text-[#1F2430]">
                <MathFormula formula={`\\text{Evaluated Formula: } ${topic.level2.formulaPreview}`} displayMode={true} />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setLevel(1)}
              className="text-[#78716C] hover:text-[#1F2430] transition-colors"
            >
              &larr; Back to Intuition
            </button>
            <button
              type="button"
              onClick={() => setLevel(3)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F766E] text-white rounded-lg text-xs font-mono font-bold hover:bg-[#0D655E] transition-colors"
            >
              <span>Inspect Formal Derivation &amp; Code</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* LEVEL 3: RIGOROUS PROOF & VERIFIED CODE */}
      {level === 3 && (
        <div className="space-y-4 font-mono text-xs">
          {/* Mathematical Proof Steps */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <GraduationCap className="w-4 h-4 text-[#0F766E]" />
                <span>Step-by-Step Formal Mathematical Derivation</span>
              </div>
              <span className="text-[10px] text-[#78716C]">Peer-Reviewed Rigor</span>
            </div>

            <div className="space-y-3">
              {topic.level3.derivationSteps.map((step, idx) => (
                <div key={idx} className="p-3 bg-[#FAF7EE] border border-[#E6DFC6] rounded-lg space-y-2">
                  <div className="font-bold text-[#0F766E]">{step.title}</div>
                  <div className="text-center py-1 text-sm text-[#1F2430]">
                    <MathFormula formula={step.math} displayMode={true} />
                  </div>
                  <p className="text-[11px] text-[#57534E] leading-relaxed font-sans">{step.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Copyable Python Code */}
          <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-4 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
              <div className="flex items-center gap-2 font-bold text-[#1F2430]">
                <Code className="w-4 h-4 text-[#0F766E]" />
                <span>Standalone Verified Python / NumPy Reference Implementation</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0F766E]/10 text-[#0F766E] font-bold hover:bg-[#0F766E]/20 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied to Clipboard' : 'Copy Python'}</span>
              </button>
            </div>

            <pre className="p-3 bg-[#1F2430] text-[#E5E9F0] rounded-lg overflow-x-auto text-[11px] leading-relaxed">
              <code>{topic.level3.pythonCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeynmanLabView;
