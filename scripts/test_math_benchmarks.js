const path = require('path');
const math = require(path.resolve(__dirname, '../tmp_math/signalMath.js'));

console.log('=== RUNNING IN-BROWSER MATH BENCHMARK VERIFICATION ===\n');

// Mulberry32 32-bit stateful PRNG for exact mathematical determinism and reproducibility
function createMulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GLOBAL_BENCHMARK_SEED = 20261112;
console.log(`[SEED] Initialized deterministic mulberry32 PRNG (Master Seed: ${GLOBAL_BENCHMARK_SEED})\n`);

let passedTests = 0;
let totalTests = 0;

function assertTest(name, condition, details) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${name} -> ${details}`);
  } else {
    console.error(`[FAIL] ${name} -> ${details}`);
  }
}

// 1. Multitaper F-test: recover 3 tones (8.3, 21.7, 44 Hz) in noise
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 1);
  const fs = 200, N = 512;
  let recallCount = 0;
  const nTrials = 15;
  for (let trial = 0; trial < nTrials; trial++) {
    const sig = Array.from({ length: N }, (_, i) => {
      const t = i / fs;
      return (
        Math.sin(2 * Math.PI * 8.3 * t) +
        Math.sin(2 * Math.PI * 21.7 * t) +
        Math.sin(2 * Math.PI * 44.0 * t) +
        (rng() - 0.5) * 0.5
      );
    });
    const res = math.computeMultitaperPSD(sig, fs, 3.5, 5);
    const foundLines = res.fTest.filter((f) => f.isLine).map((f) => f.frequency);
    const has8 = foundLines.some((f) => Math.abs(f - 8.3) <= 1.0);
    const has21 = foundLines.some((f) => Math.abs(f - 21.7) <= 1.0);
    const has44 = foundLines.some((f) => Math.abs(f - 44.0) <= 1.0);
    if (has8 && has21 && has44) recallCount++;
  }
  assertTest(
    'Multitaper F-test: recover 3 tones in noise',
    recallCount >= 14,
    `${recallCount}/${nTrials} trials recovered all 3 tones`
  );
}

// 2. Multitaper F-test: false tones on pure noise (30 runs)
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 2);
  const fs = 200, N = 512;
  let totalFalseLines = 0;
  const nRuns = 30;
  for (let run = 0; run < nRuns; run++) {
    const noise = Array.from({ length: N }, () => (rng() - 0.5) * 2.0);
    const res = math.computeMultitaperPSD(noise, fs, 3.5, 5);
    const lines = res.fTest.filter((f) => f.isLine).length;
    totalFalseLines += lines;
  }
  const avgFalse = totalFalseLines / nRuns;
  assertTest(
    'Multitaper F-test: false tones on pure noise',
    avgFalse <= 1.0,
    `Average false lines per run: ${avgFalse.toFixed(2)} (threshold <= 1.0)`
  );
}

// 3. Multitaper F-test: scale invariance (0.1x, 1x, 10x, 100x)
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 3);
  const fs = 200, N = 512;
  const baseNoise = Array.from({ length: N }, () => rng() - 0.5);
  const scales = [0.1, 1.0, 10.0, 100.0];
  const flaggedCounts = scales.map((s) => {
    const scaled = baseNoise.map((v) => v * s);
    const res = math.computeMultitaperPSD(scaled, fs, 3.5, 5);
    return res.fTest.filter((f) => f.isLine).length;
  });
  const allEqual = flaggedCounts.every((c) => c === flaggedCounts[0]);
  assertTest(
    'Multitaper F-test: scale invariance across 0.1x to 100x',
    allEqual,
    `Flagged line counts: ${JSON.stringify(flaggedCounts)}`
  );
}

// 4. Granger Causality: X drives Y
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 4);
  const N = 400;
  let xToYCount = 0;
  let yToXCount = 0;
  const nTrials = 25;
  for (let trial = 0; trial < nTrials; trial++) {
    const X = new Float64Array(N);
    const Y = new Float64Array(N);
    for (let t = 1; t < N; t++) {
      X[t] = 0.5 * X[t - 1] + (rng() - 0.5);
      Y[t] = 0.4 * Y[t - 1] + 0.6 * X[t - 1] + (rng() - 0.5);
    }
    const res = math.computeGrangerCausality(Array.from(X), Array.from(Y), 2);
    if (res.direction === 'X_causes_Y') xToYCount++;
    if (res.direction === 'Y_causes_X' || res.direction === 'bidirectional') yToXCount++;
  }
  assertTest(
    'Granger causality: X drives Y recovery',
    xToYCount >= 23 && yToXCount <= 2,
    `X->Y correct: ${xToYCount}/${nTrials}, False reverse links: ${yToXCount}/${nTrials}`
  );
}

// 5. Coherence: shared 30 Hz tone in independent noise
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 5);
  const fs = 200, N = 512;
  let peakFreqTotal = 0;
  const nTrials = 15;
  let correctPeak = 0;
  for (let trial = 0; trial < nTrials; trial++) {
    const ch1 = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 30 * (i / fs)) + (rng() - 0.5) * 1.5);
    const ch2 = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 30 * (i / fs)) + (rng() - 0.5) * 1.5);
    const res = math.computeCoherenceAndXCorr(ch1, ch2, fs);
    if (Math.abs(res.peakCoherence.frequency - 30.0) <= 2.0) correctPeak++;
    peakFreqTotal += res.peakCoherence.frequency;
  }
  const meanPeak = peakFreqTotal / nTrials;
  assertTest(
    'Coherence: shared 30 Hz tone in independent noise',
    correctPeak >= 13,
    `Identified 30 Hz peak in ${correctPeak}/${nTrials} trials (Mean peak: ${meanPeak.toFixed(2)} Hz)`
  );
}

// 6. PCA explained variance for known covariance 7:2:1
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 6);
  const N = 2000;
  const s1 = Array.from({ length: N }, () => (rng() - 0.5) * Math.sqrt(12 * 7.0));
  const s2 = Array.from({ length: N }, () => (rng() - 0.5) * Math.sqrt(12 * 2.0));
  const s3 = Array.from({ length: N }, () => (rng() - 0.5) * Math.sqrt(12 * 1.0));
  const res = math.computePCA({ ch1: s1, ch2: s2, ch3: s3 }, ['ch1', 'ch2', 'ch3']);
  const r1 = res.components[0].explainedVarianceRatio;
  const r2 = res.components[1].explainedVarianceRatio;
  const r3 = res.components[2].explainedVarianceRatio;
  const match = Math.abs(r1 - 0.70) < 0.05 && Math.abs(r2 - 0.20) < 0.05 && Math.abs(r3 - 0.10) < 0.05;
  assertTest(
    'PCA explained variance for known covariance 7:2:1',
    match && !isNaN(r3),
    `Components: ${(r1 * 100).toFixed(1)}% / ${(r2 * 100).toFixed(1)}% / ${(r3 * 100).toFixed(1)}%`
  );
}

// 7. Matrix profile: locate planted odd segment in sine (600 samples)
{
  const N = 600;
  const data = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 0.05 * i));
  const plantedIdx = 350;
  for (let i = plantedIdx; i < plantedIdx + 24; i++) {
    data[i] = -1.0 * Math.sin(2 * Math.PI * 0.25 * i);
  }
  const res = math.computeMatrixProfile(data, 24);
  const error = Math.abs(res.maxDiscordIndex - plantedIdx);
  assertTest(
    'Matrix profile: locate planted odd segment',
    error <= 5,
    `Planted at ${plantedIdx}, detected at ${res.maxDiscordIndex} (error: ${error} samples <= 30)`
  );
}

// 8. Auto-Analyst on PURE NOISE (300 seeded runs + Pink noise across 3 lengths & 2 fs): must yield ZERO validated findings!
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 8);
  const fs = 200, N = 1000;
  let totalValidated = 0;
  const nRuns = 300;
  for (let r = 0; r < nRuns; r++) {
    const noise = Array.from({ length: N }, () => (rng() - 0.5) * 2.0);
    const findings = math.runAutoAnalystEngine(noise, fs);
    const validated = findings.filter((f) => f.status === 'validated');
    if (validated.length > 0) {
      console.log('False finding detected on pure noise run', r, ':', validated.map((v) => ({ id: v.id, title: v.title, metric: v.metric, value: v.value })));
    }
    totalValidated += validated.length;
  }
  const falseAlarmRate = totalValidated / nRuns;
  const ciUpper = ((1 - Math.pow(0.025, 1 / nRuns)) * 100).toFixed(2); // Clopper-Pearson exact 95% CI upper bound

  // Additional noise verification: pink noise (1/f) across 3 record lengths (400, 1000, 2500) and 2 sampling rates (100, 500 Hz)
  let pinkValidated = 0;
  const pinkLengths = [400, 1000, 2500];
  const pinkRates = [100, 500];
  for (const nLen of pinkLengths) {
    for (const sRate of pinkRates) {
      let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
      const pinkNoise = Array.from({ length: nLen }, () => {
        const white = (rng() - 0.5) * 2;
        b0 = 0.99886*b0 + white*0.0555179;
        b1 = 0.99332*b1 + white*0.0750759;
        b2 = 0.96900*b2 + white*0.1538520;
        b3 = 0.86650*b3 + white*0.3104856;
        b4 = 0.55000*b4 + white*0.5329522;
        b5 = -0.7616*b5 - white*0.0168980;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white*0.5362;
        b6 = white*0.115926;
        return pink * 0.11;
      });
      const pinkFindings = math.runAutoAnalystEngine(pinkNoise, sRate);
      const val = pinkFindings.filter((f) => f.status === 'validated');
      pinkValidated += val.length;
    }
  }

  assertTest(
    'Auto-Analyst on PURE NOISE (300 seeded runs + pink noise)',
    totalValidated === 0 && pinkValidated === 0,
    `Total validated findings: white noise=${totalValidated}/300, pink noise=${pinkValidated}/6 (False-alarm rate: ${(falseAlarmRate * 100).toFixed(2)}%, 95% CI upper bound: ${ciUpper}% [~1.3%], n=${nRuns})`
  );
}

// 9. Auto-Analyst on Hidden Signal (tones 8.3/21.7/44 Hz + spike + shift)
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 9);
  const fs = 200, N = 1000;
  const sig = Array.from({ length: N }, (_, i) => {
    const t = i / fs;
    let v =
      Math.sin(2 * Math.PI * 8.3 * t) +
      Math.sin(2 * Math.PI * 21.7 * t) +
      Math.sin(2 * Math.PI * 44.0 * t) +
      (rng() - 0.5) * 0.4;
    if (i >= 500) v += 1.8; // Mean shift
    return v;
  });
  sig[250] += 12.0; // Planted spike
  const findings = math.runAutoAnalystEngine(sig, fs);
  const validated = findings.filter((f) => f.status === 'validated');
  const hasSpike = validated.some((f) => f.id.includes('transient'));
  const hasShift = validated.some((f) => f.id.includes('regime'));
  const hasTones = validated.some((f) => f.id.includes('harmonic'));
  assertTest(
    'Auto-Analyst on Hidden Signal discovery detection',
    hasSpike && hasShift && hasTones,
    `Detected features: Spike=${hasSpike}, Shift=${hasShift}, Tones=${hasTones} (Total validated: ${validated.length})`
  );
}

// 10. Rosner ESD: clean noise gets 0 outliers, planted spikes detected
{
  const rng = createMulberry32(GLOBAL_BENCHMARK_SEED + 10);
  const clean = Array.from({ length: 500 }, () => (rng() - 0.5) * 2.0);
  const resClean = math.computeRosnerESD(clean, 5, 0.05);
  clean[100] = 15.0;
  clean[300] = -14.0;
  const resSpikes = math.computeRosnerESD(clean, 5, 0.05);
  assertTest(
    'Rosner ESD: false alarms on noise and planted spike recovery',
    resClean.numOutliers === 0 && resSpikes.numOutliers === 2,
    `Clean noise outliers: ${resClean.numOutliers} (Target 0), Planted 2 spikes: ${resSpikes.numOutliers} (Target 2)`
  );
}

console.log(`\n=== BENCHMARK SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
process.exit(passedTests === totalTests ? 0 : 1);
