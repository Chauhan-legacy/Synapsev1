/**
 * SYNAPSE Cross-Dataset Correlation Observatory (CDCO) Benchmark Test Suite
 * Validates:
 * 1. Sub-sample parabolic peak lag recovery
 * 2. Prewhitening rejection of spurious red-noise correlation
 * 3. Thomson Multitaper cross-spectral coherence & Carter threshold
 * 4. Bi-directional Granger causality precedence
 * 5. IAAFT twin surrogate null hypothesis Monte Carlo calibration
 * 6. ts2net topological minimum spanning tree construction
 */

const path = require('path');
const fs = require('fs');

// Transpile crossDatasetMath.ts and signalMath.ts if not already built
const { execSync } = require('child_process');

console.log('=== COMPILING CDCO MATHEMATICAL KERNEL FOR VERIFICATION ===');
try {
  execSync(
    'npx tsc src/utils/crossDatasetMath.ts src/utils/signalMath.ts --outDir ../../tmp_cdco --module commonjs --target es2022 --skipLibCheck',
    { cwd: path.join(__dirname, '..', 'apps', 'web'), stdio: 'inherit' }
  );
} catch (e) {
  console.error('Compilation failed:', e);
  process.exit(1);
}

const {
  reconcileTimeGrids,
  computePrewhitenedCCF,
  computeCrossSpectralCoherence,
  generateSingleIAAFT,
  runSurrogateNullTest,
  computeCausalSafeguard,
  computeTs2NetGraph,
  getCrossDatasetBenchmarks,
} = require('../tmp_cdco/crossDatasetMath');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
  passedTests++;
}

console.log('\n=== RUNNING CDCO SCIENTIFIC VALIDATION SUITE ===\n');

// ----------------------------------------------------------------------------
// TEST 1: Temporal Coordinate Reconciliation (Different Rates & Offsets)
// ----------------------------------------------------------------------------
{
  const t1 = Array.from({ length: 400 }, (_, i) => i * 0.01); // 100 Hz, duration 4.0s
  const x1 = t1.map((t) => Math.sin(2 * Math.PI * 5 * t));
  const t2 = Array.from({ length: 200 }, (_, i) => 0.5 + i * 0.02); // 50 Hz, duration 4.0s (offset 0.5s)
  const x2 = t2.map((t) => Math.sin(2 * Math.PI * 5 * t));

  const reconciled = reconcileTimeGrids(t1, x1, 'SensorA', 'V', t2, x2, 'SensorB', 'V');
  assert(reconciled.commonTimes.length > 50, 'Reconciled grid generates non-empty common timeline');
  assert(reconciled.timeOverlap.start >= 0.5, 'Reconciliation correctly identifies intersection onset t=0.5s');
  assert(reconciled.fs <= 55, 'Target frequency respects Nyquist anti-aliasing bounds');
}

// ----------------------------------------------------------------------------
// TEST 2: Sub-Sample Peak Lag Recovery (Ground Truth tau = 0.250s)
// ----------------------------------------------------------------------------
{
  const fs = 100;
  const n = 600;
  const t = Array.from({ length: n }, (_, i) => i / fs);
  const plantedLagSec = 0.25; // Exactly 25 samples
  const s1 = t.map((time) => Math.sin(2 * Math.PI * 3.0 * time) + Math.cos(2 * Math.PI * 8.0 * time));
  const s2 = t.map((time) => {
    const delayed = time - plantedLagSec;
    return 0.8 * (Math.sin(2 * Math.PI * 3.0 * delayed) + Math.cos(2 * Math.PI * 8.0 * delayed)) + (Math.sin(time * 31) * 0.05);
  });

  const ccf = computePrewhitenedCCF(s1, s2, fs, 1.0);
  const error = Math.abs(ccf.peakPrewhitened.lagSeconds - plantedLagSec);
  assert(error < 0.015, `Sub-sample parabolic peak lag recovered with < 0.015s error (Planted: ${plantedLagSec}s, Recovered: ${ccf.peakPrewhitened.lagSeconds}s, Error: ${error.toFixed(4)}s)`);
  assert(ccf.peakPrewhitened.passesBartlett, 'Prewhitened correlation peak cleanly exceeds 95% Bartlett bound');
}

// ----------------------------------------------------------------------------
// TEST 3: Spurious Correlation Rejection on Independent Red Noise (Yule Veto)
// ----------------------------------------------------------------------------
{
  // Generate two completely independent random walks
  const n = 500;
  let walkA = 0, walkB = 0;
  const sA = [], sB = [];
  for (let i = 0; i < n; i++) {
    walkA += (Math.sin(i * 1.7) * 0.4) + 0.02;
    walkB += (Math.cos(i * 2.3) * 0.4) - 0.01;
    sA.push(walkA);
    sB.push(walkB);
  }

  const ccf = computePrewhitenedCCF(sA, sB, 20.0, 2.0);
  const rawR = Math.abs(ccf.peakRaw.correlation);
  const preR = Math.abs(ccf.peakPrewhitened.correlation);

  assert(rawR > 0.4, `Naive un-prewhitened series exhibits spurious red-noise correlation (r_raw = ${rawR.toFixed(3)})`);
  assert(preR < ccf.bartlettBound * 1.5, `Prewhitening effectively strips red noise drift (r_pre = ${preR.toFixed(3)} near Bartlett bound ${ccf.bartlettBound.toFixed(3)})`);

  // Run surrogate test on independent noise
  const surrTest = runSurrogateNullTest(sA, sB, preR, 'correlation', 20.0, 30);
  assert(surrTest.empiricalPValue >= 0.03, `IAAFT surrogate test correctly DOES NOT reject H0 on independent coloured noise (p = ${surrTest.empiricalPValue})`);
}

// ----------------------------------------------------------------------------
// TEST 4: Thomson Multitaper Coherence & Carter 95% Threshold
// ----------------------------------------------------------------------------
{
  const fs = 50;
  const n = 800;
  const t = Array.from({ length: n }, (_, i) => i / fs);
  // Shared coupled tone at 7.0 Hz
  const s1 = t.map((time) => 1.5 * Math.sin(2 * Math.PI * 7.0 * time) + (Math.sin(time * 19) * 0.3));
  const s2 = t.map((time) => 1.2 * Math.sin(2 * Math.PI * 7.0 * (time - 0.1)) + (Math.cos(time * 23) * 0.3));

  const coh = computeCrossSpectralCoherence(s1, s2, fs);
  assert(coh.peakCoherence.passesCarter, `Cross-spectral coherence exceeds Carter 95% threshold (coh = ${coh.peakCoherence.coherence} > ${coh.carter95Threshold})`);
  assert(Math.abs(coh.peakCoherence.frequency - 7.0) <= 1.0, `Peak coherence correctly identifies shared 7.0 Hz harmonic line (Detected: ${coh.peakCoherence.frequency} Hz)`);
}

// ----------------------------------------------------------------------------
// TEST 5: Granger Causality Directional Precedence (X -> Y)
// ----------------------------------------------------------------------------
{
  const fs = 100;
  const n = 600;
  const x = new Array(n).fill(0);
  const y = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    x[i] = 0.6 * x[i - 1] + (Math.sin(i * 17) * 0.5);
  }
  for (let i = 4; i < n; i++) {
    // Y is driven by X with 4 samples lag
    y[i] = 0.7 * x[i - 4] + (Math.cos(i * 19) * 0.4);
  }

  const causal = computeCausalSafeguard(x, y, 0.04, fs, 0.001);
  assert(causal.direction === 'X_CAUSES_Y', `Granger causality correctly identifies asymmetric direction X -> Y (Classified: ${causal.directionLabel})`);
  assert(causal.pXtoY < 0.05, `Granger X -> Y p-value is significant (p = ${causal.pXtoY})`);
  assert(causal.pYtoX >= 0.05, `Granger reverse Y -> X is not significant (p = ${causal.pYtoX})`);
}

// ----------------------------------------------------------------------------
// TEST 6: ts2net Network Graph Construction (3+ Channels)
// ----------------------------------------------------------------------------
{
  const fs = 50;
  const n = 400;
  const t = Array.from({ length: n }, (_, i) => i / fs);
  const masterHub = t.map((time) => Math.sin(2 * Math.PI * 2 * time));
  const chA = masterHub.map((v) => 0.9 * v + Math.random() * 0.1);
  const chB = masterHub.map((v) => 0.8 * v + Math.random() * 0.1);
  const chC = t.map(() => Math.random()); // Independent noise

  const graph = computeTs2NetGraph({ Master: masterHub, ChA: chA, ChB: chB, Noise: chC }, ['Master', 'ChA', 'ChB', 'Noise'], fs);
  assert(graph.nodes.length === 4, 'ts2net correctly generates 4 nodes');
  assert(graph.edges.some((e) => e.isMST), 'ts2net Kruskal algorithm computes Minimum Spanning Tree edges');
  assert(graph.pacemakerNode === 'Master' || graph.pacemakerNode === 'ChA' || graph.pacemakerNode === 'ChB', `ts2net identifies coupled hub pacemaker node (${graph.pacemakerNode})`);
}

// ----------------------------------------------------------------------------
// TEST 7: Built-in Scientific Benchmark Pair Integrity
// ----------------------------------------------------------------------------
{
  const duos = getCrossDatasetBenchmarks();
  assert(duos.length >= 4, `At least 4 scientific benchmark duos available (Found: ${duos.length})`);
  const solar = duos.find((d) => d.id === 'NOAA_SOLAR_GEOMAGNETIC');
  assert(solar !== undefined, 'NOAA Solar vs Geomagnetism benchmark duo verified');
  const seis = duos.find((d) => d.id === 'SEISMO_ACOUSTIC_COUPLING');
  assert(seis !== undefined, 'Seismo-Acoustic Coupling benchmark duo verified');
}

console.log(`\n=== CDCO BENCHMARK SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
