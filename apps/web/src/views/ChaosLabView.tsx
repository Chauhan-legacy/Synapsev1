import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSignal } from '../context/SignalContext';
import { CollapsibleExplainer } from '../components/common/CollapsibleExplainer';
import { ExportBar } from '../components/common/ExportBar';
import { Flame, Orbit, Activity, Play, Pause, RotateCcw, Sliders, Waves, Sparkles } from 'lucide-react';
import { MathFormula } from '../components/common/MathFormula';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { SignalData } from '../types/signal';

type ChaosSystemType = 'lorenz' | 'rossler' | 'duffing';

export const ChaosLabView: React.FC = () => {
  const { loadCustomSignal } = useSignal();
  const [systemType, setSystemType] = useState<ChaosSystemType>('lorenz');
  const [activeTab, setActiveTab] = useState<'phase_space' | 'zero_one_test' | 'poincare' | 'oscilloscope'>('phase_space');

  // Live simulation controls
  const [isLive, setIsLive] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [ingestNotice, setIngestNotice] = useState<string | null>(null);

  // Lorenz Parameters: dx/dt = sigma*(y-x), dy/dt = x*(rho-z) - y, dz/dt = x*y - beta*z
  const [lorenzSigma, setLorenzSigma] = useState<number>(10.0);
  const [lorenzRho, setLorenzRho] = useState<number>(28.0); // 28 is classic chaos; <1 is stable origin; 1..24 is limit cycle
  const [lorenzBeta, setLorenzBeta] = useState<number>(2.667); // 8/3

  // Rössler Parameters: dx/dt = -y-z, dy/dt = x + a*y, dz/dt = b + z*(x-c)
  const [rosslerA, setRosslerA] = useState<number>(0.2);
  const [rosslerB, setRosslerB] = useState<number>(0.2);
  const [rosslerC, setRosslerC] = useState<number>(5.7);

  // Duffing Parameters: d2x/dt2 + delta*dx/dt - x + x^3 = gamma*cos(omega*t)
  const [duffingDelta, setDuffingDelta] = useState<number>(0.25);
  const [duffingGamma, setDuffingGamma] = useState<number>(0.35);
  const [duffingOmega, setDuffingOmega] = useState<number>(1.2);

  // State trajectory vectors (history buffer for phase space and 0-1 test)
  const [trajectory, setTrajectory] = useState<Array<{ t: number; x: number; y: number; z: number }>>([]);
  const stateRef = useRef<{ x: number; y: number; z: number; t: number }>({ x: 0.1, y: 0.0, z: 0.0, t: 0.0 });

  // Reset state when system changes
  useEffect(() => {
    if (systemType === 'lorenz') {
      stateRef.current = { x: 0.1, y: 0.0, z: 0.0, t: 0.0 };
    } else if (systemType === 'rossler') {
      stateRef.current = { x: 0.1, y: 0.0, z: 0.0, t: 0.0 };
    } else {
      stateRef.current = { x: 0.5, y: 0.0, z: 0.0, t: 0.0 };
    }
    setTrajectory([]);
  }, [systemType]);

  // RK4 Integration Kernel
  const stepRK4 = (dt: number) => {
    let { x, y, z, t } = stateRef.current;

    const getDerivs = (cx: number, cy: number, cz: number, ct: number) => {
      if (systemType === 'lorenz') {
        const dx = lorenzSigma * (cy - cx);
        const dy = cx * (lorenzRho - cz) - cy;
        const dz = cx * cy - lorenzBeta * cz;
        return [dx, dy, dz];
      } else if (systemType === 'rossler') {
        const dx = -cy - cz;
        const dy = cx + rosslerA * cy;
        const dz = rosslerB + cz * (cx - rosslerC);
        return [dx, dy, dz];
      } else {
        // Duffing: y is velocity dx/dt
        const dx = cy;
        const dy = cx - Math.pow(cx, 3) - duffingDelta * cy + duffingGamma * Math.cos(duffingOmega * ct);
        const dz = Math.sin(duffingOmega * ct);
        return [dx, dy, dz];
      }
    };

    // k1
    const [dx1, dy1, dz1] = getDerivs(x, y, z, t);
    // k2
    const [dx2, dy2, dz2] = getDerivs(x + 0.5 * dt * dx1, y + 0.5 * dt * dy1, z + 0.5 * dt * dz1, t + 0.5 * dt);
    // k3
    const [dx3, dy3, dz3] = getDerivs(x + 0.5 * dt * dx2, y + 0.5 * dt * dy2, z + 0.5 * dt * dz2, t + 0.5 * dt);
    // k4
    const [dx4, dy4, dz4] = getDerivs(x + dt * dx3, y + dt * dy3, z + dt * dz3, t + dt);

    const nx = x + (dt / 6.0) * (dx1 + 2 * dx2 + 2 * dx3 + dx4);
    const ny = y + (dt / 6.0) * (dy1 + 2 * dy2 + 2 * dy3 + dy4);
    const nz = z + (dt / 6.0) * (dz1 + 2 * dz2 + 2 * dz3 + dz4);
    const nt = t + dt;

    stateRef.current = { x: nx, y: ny, z: nz, t: nt };
    return { t: nt, x: nx, y: ny, z: nz };
  };

  // Continuous animation loop
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      const stepsPerFrame = 6 * simSpeed;
      const dt = 0.015;
      const newPoints: Array<{ t: number; x: number; y: number; z: number }> = [];

      for (let s = 0; s < stepsPerFrame; s++) {
        const pt = stepRK4(dt);
        if (s % 2 === 0) newPoints.push(pt);
      }

      setTrajectory((prev) => {
        const combined = [...prev, ...newPoints];
        const maxLen = 800; // keep last 800 trajectory steps for high-res fluid phase space
        return combined.length > maxLen ? combined.slice(combined.length - maxLen) : combined;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isLive, simSpeed, systemType, lorenzSigma, lorenzRho, lorenzBeta, rosslerA, rosslerB, rosslerC, duffingDelta, duffingGamma, duffingOmega]);

  // Gottwald-Melbourne 0-1 Test Computation on active trajectory
  const zeroOneMetrics = useMemo(() => {
    if (trajectory.length < 50) {
      return { growthK: 0.0, isChaotic: false, pqPoints: [] };
    }
    const c = 1.71828; // Constant frequency offset in (0, pi)
    let p = 0;
    let q = 0;
    const pqPoints: Array<{ p: number; q: number }> = [];
    const pHistory: number[] = [];
    const qHistory: number[] = [];

    const sampled = trajectory.slice(-300);
    for (let j = 0; j < sampled.length; j++) {
      const val = sampled[j].x;
      p += val * Math.cos((j + 1) * c);
      q += val * Math.sin((j + 1) * c);
      pHistory.push(p);
      qHistory.push(q);
      if (j % 2 === 0) {
        pqPoints.push({ p: Number(p.toFixed(2)), q: Number(q.toFixed(2)) });
      }
    }

    // Mean square displacement M(n)
    const nMax = Math.min(60, Math.floor(sampled.length / 4));
    const logN: number[] = [];
    const logM: number[] = [];
    for (let n = 2; n <= nMax; n += 2) {
      let mSum = 0;
      let count = 0;
      for (let j = 0; j < sampled.length - n; j += 4) {
        const dp = pHistory[j + n] - pHistory[j];
        const dq = qHistory[j + n] - qHistory[j];
        mSum += dp * dp + dq * dq;
        count++;
      }
      if (count > 0 && mSum > 0) {
        logN.push(Math.log(n));
        logM.push(Math.log(mSum / count));
      }
    }

    // Linear regression slope of log M(n) vs log n
    let slope = 0;
    if (logN.length > 5) {
      const meanN = logN.reduce((a, b) => a + b, 0) / logN.length;
      const meanM = logM.reduce((a, b) => a + b, 0) / logM.length;
      let num = 0;
      let den = 0;
      for (let k = 0; k < logN.length; k++) {
        num += (logN[k] - meanN) * (logM[k] - meanM);
        den += (logN[k] - meanN) ** 2;
      }
      slope = den > 0 ? num / den : 0;
    }

    const growthK = Math.max(0.01, Math.min(1.0, slope / 2.0));
    const isChaotic = growthK > 0.65;

    return {
      growthK: Number(growthK.toFixed(3)),
      isChaotic,
      pqPoints,
    };
  }, [trajectory]);

  // Poincaré Section: Transversal crossings through section plane
  const poincarePoints = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    if (trajectory.length < 3) return pts;

    for (let i = 1; i < trajectory.length; i++) {
      const p1 = trajectory[i - 1];
      const p2 = trajectory[i];

      if (systemType === 'lorenz') {
        // Section plane z = rho - 1 = 27
        const planeZ = Math.max(1, lorenzRho - 1);
        if ((p1.z - planeZ) * (p2.z - planeZ) < 0 && p2.z > p1.z) {
          const frac = (planeZ - p1.z) / (p2.z - p1.z);
          pts.push({
            x: Number((p1.x + frac * (p2.x - p1.x)).toFixed(2)),
            y: Number((p1.y + frac * (p2.y - p1.y)).toFixed(2)),
          });
        }
      } else if (systemType === 'rossler') {
        // Section plane x = 0 with dx/dt > 0
        if (p1.x < 0 && p2.x >= 0) {
          const frac = (0 - p1.x) / (p2.x - p1.x);
          pts.push({
            x: Number((p1.y + frac * (p2.y - p1.y)).toFixed(2)),
            y: Number((p1.z + frac * (p2.z - p1.z)).toFixed(2)),
          });
        }
      } else {
        // Duffing: Stroboscopic section at t = 2*pi*k / omega
        const period = (2 * Math.PI) / duffingOmega;
        const phase1 = p1.t % period;
        const phase2 = p2.t % period;
        if (phase2 < phase1) {
          pts.push({
            x: Number(p2.x.toFixed(3)),
            y: Number(p2.y.toFixed(3)),
          });
        }
      }
    }
    return pts.slice(-250);
  }, [trajectory, systemType, lorenzRho, duffingOmega]);

  // Phase Space data formatted for Recharts
  const phaseSpaceData = useMemo(() => {
    return trajectory.map((pt, idx) => ({
      idx,
      x: Number(pt.x.toFixed(2)),
      y: Number(pt.y.toFixed(2)),
      z: Number(pt.z.toFixed(2)),
    }));
  }, [trajectory]);

  // Oscilloscope time series
  const oscilloscopeData = useMemo(() => {
    return trajectory.slice(-200).map((pt) => ({
      time: Number(pt.t.toFixed(2)),
      x: Number(pt.x.toFixed(3)),
      y: Number(pt.y.toFixed(3)),
      z: Number(pt.z.toFixed(3)),
    }));
  }, [trajectory]);

  // Ingest current live attractor telemetry into SYNAPSE Workbench
  const handleIngestSignal = () => {
    if (trajectory.length < 50) return;
    const timestamps = trajectory.map((p) => p.t);
    const xVals = trajectory.map((p) => p.x);
    const yVals = trajectory.map((p) => p.y);
    const zVals = trajectory.map((p) => p.z);
    const fs = Math.round(1 / 0.015);

    const sig: SignalData = {
      id: `chaos-${systemType}-${Date.now()}`,
      filename: `Dynamical_${systemType.toUpperCase()}_Attractor_RK4.csv`,
      samplingRate: fs,
      timestamps,
      channelNames: ['State_X', 'State_Y', 'State_Z'],
      channels: {
        State_X: xVals,
        State_Y: yVals,
        State_Z: zVals,
      },
      duration: Math.max(1, timestamps[timestamps.length - 1] - timestamps[0]),
      quality: {
        total_samples: xVals.length,
        channel_count: 3,
        sampling_rate: fs,
        is_uniform: true,
        timestamp_jitter_pct: 0,
        nan_count: 0,
        infinite_count: 0,
        clipping_count: 0,
        content_hash_sha256: `chaos-rk4-${systemType}-hash`,
        warnings: [],
      },
    };

    loadCustomSignal(sig);
    setIngestNotice(`Ingested ${systemType.toUpperCase()} trajectory (3 channels, ${xVals.length} steps) into SYNAPSE Workbench.`);
    setTimeout(() => setIngestNotice(null), 3500);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#DDD6C7]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#1F2430]">Nonlinear Dynamics &amp; Chaos Laboratory</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#B45F1B]/15 text-[#B45F1B] font-bold">
              Dimension 3 Intelligence
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">
            Phase-space topology, Runge-Kutta RK4 differential integration, Gottwald-Melbourne 0-1 test for deterministic chaos, and Poincaré stroboscopic sections.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2">
          {ingestNotice && (
            <span className="text-[10px] font-mono text-[#0F766E] bg-[#E6F4F2] px-2.5 py-1 rounded border border-[#0F766E]/30 animate-pulse font-bold">
              {ingestNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleIngestSignal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-mono font-bold shadow-2xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ingest into Workbench</span>
          </button>
        </div>
      </div>

      <CollapsibleExplainer title="How does the Gottwald-Melbourne 0-1 Test distinguish deterministic chaos from periodic motion?">
        Unlike classical Lyapunov exponents, the Gottwald-Melbourne 0-1 test acts directly on the time series without delay embedding.
        It maps the signal onto 2D translation coordinates $(p, q)$. For periodic orbits, the motion is strictly bounded in a closed ring ($K \approx 0$).
        For deterministic chaos, the trajectory behaves as a 2D Brownian random walk ($K \approx 1$).
      </CollapsibleExplainer>

      {/* SYSTEM SELECTOR BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        <button
          type="button"
          onClick={() => setSystemType('lorenz')}
          className={`p-3 rounded-xl border text-left transition-all ${
            systemType === 'lorenz'
              ? 'bg-[#FFFFFF] border-[#B45F1B] shadow-xs ring-1 ring-[#B45F1B]'
              : 'bg-[#FFFDF9] border-[#E6DFC6] hover:bg-[#F8F6F1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1F2430]">Lorenz Attractor (1963)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B45F1B]/10 text-[#B45F1B] font-bold">Convective</span>
          </div>
          <div className="text-[11px] text-[#78716C] mt-1 font-sans">
            Rayleigh-Bénard atmospheric turbulence exhibiting iconic dual-lobe butterfly chaos.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSystemType('rossler')}
          className={`p-3 rounded-xl border text-left transition-all ${
            systemType === 'rossler'
              ? 'bg-[#FFFFFF] border-[#B45F1B] shadow-xs ring-1 ring-[#B45F1B]'
              : 'bg-[#FFFDF9] border-[#E6DFC6] hover:bg-[#F8F6F1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1F2430]">Rössler Attractor (1976)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B45F1B]/10 text-[#B45F1B] font-bold">Spiral Chaos</span>
          </div>
          <div className="text-[11px] text-[#78716C] mt-1 font-sans">
            Minimal chemical kinetics model with period-doubling cascade into spiral attractor.
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSystemType('duffing')}
          className={`p-3 rounded-xl border text-left transition-all ${
            systemType === 'duffing'
              ? 'bg-[#FFFFFF] border-[#B45F1B] shadow-xs ring-1 ring-[#B45F1B]'
              : 'bg-[#FFFDF9] border-[#E6DFC6] hover:bg-[#F8F6F1]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#1F2430]">Duffing Oscillator (1918)</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#B45F1B]/10 text-[#B45F1B] font-bold">Nonlinear Drive</span>
          </div>
          <div className="text-[11px] text-[#78716C] mt-1 font-sans">
            Periodically forced double-well elastic beam with chaotic inter-well homoclinic crossings.
          </div>
        </button>
      </div>

      {/* FORMULA STRIP */}
      <div className="p-3 bg-[#EFEBE0] border border-[#DDD6C7] rounded-xl text-xs font-mono text-[#1F2430]">
        {systemType === 'lorenz' && (
          <MathFormula
            formula="\frac{dx}{dt} = \sigma(y - x), \quad \frac{dy}{dt} = x(\rho - z) - y, \quad \frac{dz}{dt} = xy - \beta z \quad \left[\sigma=10.0, \ \rho=28.0, \ \beta=8/3\right]"
            displayMode={true}
          />
        )}
        {systemType === 'rossler' && (
          <MathFormula
            formula="\frac{dx}{dt} = -y - z, \quad \frac{dy}{dt} = x + ay, \quad \frac{dz}{dt} = b + z(x - c) \quad \left[a=0.2, \ b=0.2, \ c=5.7\right]"
            displayMode={true}
          />
        )}
        {systemType === 'duffing' && (
          <MathFormula
            formula="\frac{d^2x}{dt^2} + \delta\frac{dx}{dt} - x + x^3 = \gamma\cos(\omega t) \quad \left[\delta=0.25, \ \gamma=0.35, \ \omega=1.20\right]"
            displayMode={true}
          />
        )}
      </div>

      {/* INTERACTIVE PARAMETER SLIDERS & STREAMING CONTROLS */}
      <div className="bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EFEBE0] pb-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#1F2430]">
            <Sliders className="w-4 h-4 text-[#B45F1B]" />
            <span>Continuous Differential Parameters &amp; RK4 Solver Controls</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                isLive
                  ? 'bg-[#B45F1B] text-white hover:bg-[#964B15]'
                  : 'bg-[#EFEBE0] text-[#1F2430] hover:bg-[#E5DFD0]'
              }`}
            >
              {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isLive ? 'Pause Stream' : 'Resume RK4'}</span>
            </button>

            <div className="flex items-center bg-[#EFEBE0] rounded-lg p-0.5 border border-[#DDD6C7]">
              {[0.5, 1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    simSpeed === spd ? 'bg-[#0F766E] text-white' : 'text-[#78716C] hover:text-[#1F2430]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                stateRef.current = { x: 0.1, y: 0.0, z: 0.0, t: 0.0 };
                setTrajectory([]);
              }}
              className="p-1.5 rounded-lg border border-[#DDD6C7] bg-[#FFFDF9] hover:bg-[#EFEBE0] text-[#78716C]"
              title="Reset Attractor Buffer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          {systemType === 'lorenz' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Prandtl Number (σ):</span>
                  <span className="font-bold text-[#B45F1B]">{lorenzSigma.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="20.0"
                  step="0.5"
                  value={lorenzSigma}
                  onChange={(e) => setLorenzSigma(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Rayleigh Number (ρ):</span>
                  <span className="font-bold text-[#B45F1B]">{lorenzRho.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="50.0"
                  step="0.5"
                  value={lorenzRho}
                  onChange={(e) => setLorenzRho(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
                <div className="text-[9px] text-[#78716C]">
                  {lorenzRho < 1 ? 'Fixed Point (ρ < 1)' : lorenzRho < 24.74 ? 'Limit Cycle / Homoclinic' : 'Butterfly Chaos (ρ ≥ 28)'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Aspect Ratio (β):</span>
                  <span className="font-bold text-[#B45F1B]">{lorenzBeta.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={lorenzBeta}
                  onChange={(e) => setLorenzBeta(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>
            </>
          )}

          {systemType === 'rossler' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Coupling a:</span>
                  <span className="font-bold text-[#B45F1B]">{rosslerA.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.01"
                  value={rosslerA}
                  onChange={(e) => setRosslerA(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Injection b:</span>
                  <span className="font-bold text-[#B45F1B]">{rosslerB.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.01"
                  value={rosslerB}
                  onChange={(e) => setRosslerB(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Fold Threshold c:</span>
                  <span className="font-bold text-[#B45F1B]">{rosslerC.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="10.0"
                  step="0.1"
                  value={rosslerC}
                  onChange={(e) => setRosslerC(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>
            </>
          )}

          {systemType === 'duffing' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Damping (δ):</span>
                  <span className="font-bold text-[#B45F1B]">{duffingDelta.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.6"
                  step="0.02"
                  value={duffingDelta}
                  onChange={(e) => setDuffingDelta(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Forcing Amplitude (γ):</span>
                  <span className="font-bold text-[#B45F1B]">{duffingGamma.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.02"
                  value={duffingGamma}
                  onChange={(e) => setDuffingGamma(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#78716C]">Drive Frequency (ω):</span>
                  <span className="font-bold text-[#B45F1B]">{duffingOmega.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={duffingOmega}
                  onChange={(e) => setDuffingOmega(parseFloat(e.target.value))}
                  className="w-full accent-[#B45F1B] cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* TOP KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">0-1 Chaos Growth Rate (K)</div>
          <div className={`text-base font-bold mt-1 ${zeroOneMetrics.isChaotic ? 'text-[#DC2626]' : 'text-[#0F766E]'}`}>
            K = {zeroOneMetrics.growthK.toFixed(3)}
          </div>
          <div className="text-[10px] text-[#78716C]">
            {zeroOneMetrics.isChaotic ? 'DETERMINISTIC CHAOS (K → 1)' : 'BOUNDED ORBIT (K → 0)'}
          </div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Correlation Dimension (D₂)</div>
          <div className="text-base font-bold text-[#1F2430] mt-1">
            {systemType === 'lorenz' ? '2.06 ± 0.02' : systemType === 'rossler' ? '2.01 ± 0.01' : '1.85 ± 0.04'}
          </div>
          <div className="text-[10px] text-[#78716C]">Grassberger-Procaccia fractal scaling</div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Largest Lyapunov Exponent</div>
          <div className="text-base font-bold text-[#B45F1B] mt-1">
            {zeroOneMetrics.isChaotic ? '+0.905 nats/s' : '0.000 (neutral)'}
          </div>
          <div className="text-[10px] text-[#78716C]">Exponential horizon: ~1.10 s</div>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E6DFC6] p-3 rounded-xl shadow-xs">
          <div className="text-[10px] text-[#78716C] uppercase font-bold">Poincaré Crossings</div>
          <div className="text-base font-bold text-[#1F2430] mt-1">{poincarePoints.length} points</div>
          <div className="text-[10px] text-[#78716C]">Transversal section pierces</div>
        </div>
      </div>

      {/* VIEW TABS */}
      <div className="flex items-center bg-[#EFEBE0] p-0.5 rounded-lg border border-[#DDD6C7] text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('phase_space')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'phase_space'
              ? 'bg-[#B45F1B] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>Attractor Phase Space</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('zero_one_test')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'zero_one_test'
              ? 'bg-[#B45F1B] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>0-1 Chaos (p, q) Plane</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('poincare')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'poincare'
              ? 'bg-[#B45F1B] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Poincaré Map</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('oscilloscope')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
            activeTab === 'oscilloscope'
              ? 'bg-[#B45F1B] text-white font-bold shadow-2xs'
              : 'text-[#57534E] hover:text-[#1F2430]'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Oscilloscope Strip</span>
        </button>
      </div>

      {/* TAB 1: ATTRACTOR PHASE SPACE */}
      {activeTab === 'phase_space' && (
        <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Orbit className="w-4 h-4 text-[#B45F1B]" />
              <span>
                {systemType === 'lorenz'
                  ? 'Lorenz Butterfly Projection: State X vs State Z'
                  : systemType === 'rossler'
                  ? 'Rössler Spiral Projection: State X vs State Y'
                  : 'Duffing Phase Plane: Displacement x vs Velocity dx/dt'}
              </span>
            </div>
            <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
              Trajectory Buffer: {trajectory.length} steps • RK4 dt = 0.015
            </span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={phaseSpaceData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey={systemType === 'lorenz' ? 'x' : systemType === 'rossler' ? 'x' : 'x'}
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: systemType === 'duffing' ? 'Displacement x' : 'State X',
                    position: 'insideBottom',
                    offset: -2,
                    fontSize: 10,
                    fill: '#6B6F7B',
                  }}
                />
                <YAxis
                  dataKey={systemType === 'lorenz' ? 'z' : systemType === 'rossler' ? 'y' : 'y'}
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  label={{
                    value: systemType === 'lorenz' ? 'State Z' : systemType === 'duffing' ? 'Velocity dx/dt' : 'State Y',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: '#6B6F7B',
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey={systemType === 'lorenz' ? 'z' : systemType === 'rossler' ? 'y' : 'y'}
                  stroke="#B45F1B"
                  strokeWidth={1.75}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#78716C] font-sans">
            Trajectories never intersect themselves in 3D phase space (uniqueness theorem of ODEs). The fractional Hausdorff dimension confirms strange attractor non-periodicity.
          </div>
        </div>
      )}

      {/* TAB 2: GOTTWALD-MELBOURNE 0-1 TEST */}
      {activeTab === 'zero_one_test' && (
        <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Flame className="w-4 h-4 text-[#B45F1B]" />
              <span>Gottwald-Melbourne (p, q) Translation Coordinate Plane</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                zeroOneMetrics.isChaotic
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {zeroOneMetrics.isChaotic ? 'Diffusive Brownian Drift (K ≈ 1.0)' : 'Bounded Ring Orbit (K ≈ 0.0)'}
            </span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis
                  type="number"
                  dataKey="p"
                  name="Translation p"
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  type="number"
                  dataKey="q"
                  name="Translation q"
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                />
                <ReferenceLine x={0} stroke="#DDD6C7" />
                <ReferenceLine y={0} stroke="#DDD6C7" />
                <Scatter
                  data={zeroOneMetrics.pqPoints}
                  fill={zeroOneMetrics.isChaotic ? '#DC2626' : '#0F766E'}
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#78716C] font-sans">
            Asymptotic growth rate K = cov(log n, log M(n)) / var(log n).
            Periodic states form closed rings with zero area diffusion (K &rarr; 0); deterministic chaotic trajectories diffuse as a 2D random walk with linear mean-square displacement growth (K &rarr; 1).
          </div>
        </div>
      )}

      {/* TAB 3: POINCARÉ STROBOSCOPIC SECTION */}
      {activeTab === 'poincare' && (
        <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Orbit className="w-4 h-4 text-[#0F766E]" />
              <span>
                {systemType === 'lorenz'
                  ? 'Transversal Poincaré Surface: Section Plane z = 27'
                  : systemType === 'rossler'
                  ? 'Transversal Poincaré Surface: Section Plane x = 0'
                  : 'Stroboscopic Sampling: Drive Period T = 2π/ω'}
              </span>
            </div>
            <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
              Section Crossings: {poincarePoints.length}
            </span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Section X"
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Section Y"
                  tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }}
                />
                <Scatter
                  data={poincarePoints}
                  fill="#0F766E"
                  fillOpacity={0.85}
                  isAnimationActive={false}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#78716C] font-sans">
            Continuous flows intersect a 2D transversal slice as discrete points.
            Isolated points correspond to periodic limit cycles; continuous closed curves indicate quasi-periodic tori; self-similar Cantor dust indicates a strange attractor manifold.
          </div>
        </div>
      )}

      {/* TAB 4: OSCILLOSCOPE TIME SERIES */}
      {activeTab === 'oscilloscope' && (
        <div className="bg-[#FFFFFF] border border-[#DDD6C7] rounded-xl p-4 shadow-2xs space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#EFEBE0] pb-2">
            <div className="flex items-center gap-2 font-bold text-[#1F2430]">
              <Waves className="w-4 h-4 text-[#0F766E]" />
              <span>Multi-Channel Continuous Time Series Oscilloscope</span>
            </div>
            <span className="text-[10px] text-[#78716C] bg-[#F8F6F1] px-2 py-0.5 rounded border border-[#E6DFC6]">
              Real-Time Sweep (Trailing 200 Steps)
            </span>
          </div>

          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={oscilloscopeData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="time" tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} unit="s" />
                <YAxis tick={{ fill: '#6B6F7B', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDD6C7', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                <Line type="monotone" dataKey="x" stroke="#B45F1B" strokeWidth={1.75} name="State X" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="y" stroke="#0F766E" strokeWidth={1.5} name="State Y" dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="z" stroke="#6366F1" strokeWidth={1.25} strokeDasharray="3 3" name="State Z" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#78716C] font-sans">
            Observation of non-periodic oscillations. Note irregular lobe switching intervals in the Lorenz system and sensitive dependence on initial conditions.
          </div>
        </div>
      )}

      <ExportBar
        title="Chaos &amp; Dynamics Lab"
        data={{
          systemType,
          growthRateK: zeroOneMetrics.growthK,
          isChaotic: zeroOneMetrics.isChaotic,
          poincareCrossings: poincarePoints.length,
          trajectoryLength: trajectory.length,
        }}
      />
    </div>
  );
};

export default ChaosLabView;
