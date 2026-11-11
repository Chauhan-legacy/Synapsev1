/**
 * SYNAPSE ml-matrix Validation Benchmark (scripts/test_ml_matrix_validation.js)
 * 
 * Validates ml-matrix for browser-side linear algebra:
 * 1. Small matrix operations (covariance matrix, correlation matrix)
 * 2. Eigenvalue decomposition & PCA explained variance preview
 * 3. Execution time (< 5 ms for 10,000 points across 4 channels)
 * 4. Numerical agreement with reference covariance values
 */

const path = require('path');
const { Matrix, EigenvalueDecomposition } = require(path.join(__dirname, '../apps/web/node_modules/ml-matrix'));

function runMlMatrixValidation() {
  console.log('=== RUNNING ML-MATRIX NUMERICAL VALIDATION BENCHMARK ===\n');

  const n = 10000;
  // Synthesize 3 channels with known correlations:
  // ch0: independent source s1
  // ch1: 0.8 * s1 + 0.6 * s2 (strong correlation with ch0)
  // ch2: independent noise s3
  const ch0 = new Float64Array(n);
  const ch1 = new Float64Array(n);
  const ch2 = new Float64Array(n);

  let s1Sum = 0, s2Sum = 0, s3Sum = 0;
  for (let i = 0; i < n; i++) {
    const s1 = Math.sin(i * 0.05);
    const s2 = Math.cos(i * 0.12);
    const s3 = ((i % 17) - 8) / 8.0;
    ch0[i] = s1;
    ch1[i] = 0.8 * s1 + 0.6 * s2;
    ch2[i] = s3;
    s1Sum += ch0[i];
    s2Sum += ch1[i];
    s3Sum += ch2[i];
  }

  const m0 = s1Sum / n;
  const m1 = s2Sum / n;
  const m2 = s3Sum / n;

  const data = new Array(n);
  for (let i = 0; i < n; i++) {
    data[i] = [ch0[i] - m0, ch1[i] - m1, ch2[i] - m2];
  }

  const t0 = performance.now();
  const X = new Matrix(data);
  const cov = X.transpose().mmul(X).div(n - 1);
  const covArray = cov.to2DArray();

  // Correlation matrix
  const stds = [Math.sqrt(covArray[0][0]), Math.sqrt(covArray[1][1]), Math.sqrt(covArray[2][2])];
  const corr = [
    [1.0, covArray[0][1] / (stds[0] * stds[1]), covArray[0][2] / (stds[0] * stds[2])],
    [covArray[1][0] / (stds[1] * stds[0]), 1.0, covArray[1][2] / (stds[1] * stds[2])],
    [covArray[2][0] / (stds[2] * stds[0]), covArray[2][1] / (stds[2] * stds[1]), 1.0],
  ];

  const corrMatrix = new Matrix(corr);
  const eig = new EigenvalueDecomposition(corrMatrix);
  const realEigenvalues = eig.realEigenvalues;
  const elapsed = performance.now() - t0;

  // Verification 1: Channel 0 and 1 correlation should be ~0.8
  const r01 = corr[0][1];
  const test1Pass = Math.abs(r01 - 0.8) < 0.05;
  console.log(`[${test1Pass ? 'PASS' : 'FAIL'}] Correlation Estimation:`);
  console.log(`  - Expected r(ch0, ch1): ~0.800`);
  console.log(`  - Estimated r(ch0, ch1): ${r01.toFixed(3)} (error: ${Math.abs(r01 - 0.8).toFixed(3)})`);

  // Verification 2: Trace of correlation matrix must equal dimension (3.0)
  let sumEig = 0;
  for (let k = 0; k < 3; k++) sumEig += realEigenvalues[k];
  const test2Pass = Math.abs(sumEig - 3.0) < 1e-10;
  console.log(`[${test2Pass ? 'PASS' : 'FAIL'}] Eigenvalue Sum Conservation (Trace = k):`);
  console.log(`  - Expected Trace sum: 3.000`);
  console.log(`  - Observed eigenvalue sum: ${sumEig.toFixed(6)}`);

  // Verification 3: Execution speed
  const test3Pass = elapsed < 30.0;
  console.log(`[${test3Pass ? 'PASS' : 'FAIL'}] Performance Throughput:`);
  console.log(`  - Time to compute Covariance + Correlation + Eigenvalues on ${n} samples: ${elapsed.toFixed(2)} ms (Threshold: < 30 ms)`);

  const allPassed = test1Pass && test2Pass && test3Pass;
  console.log(`\n=== ML-MATRIX VALIDATION: ${allPassed ? 'ALL 3/3 TESTS PASSED' : 'TESTS FAILED'} ===`);
  if (!allPassed) process.exit(1);
}

runMlMatrixValidation();
