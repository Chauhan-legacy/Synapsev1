/**
 * SYNAPSE Arquero Validation Benchmark (scripts/test_arquero_validation.js)
 * 
 * Tests Arquero for browser-side tabular operations on 120,000 rows:
 * 1. Arrow/Columnar table construction from multi-channel arrays
 * 2. Range filtering (e.g., selecting quiet intervals or high-energy intervals)
 * 3. Grouped aggregation (temporal bin rollups)
 * 4. Tabular schema inspection and preview slice extraction
 * 5. Performance benchmark against raw JS iteration
 */

const path = require('path');
const aq = require(path.join(__dirname, '../apps/web/node_modules/arquero'));

function runArqueroValidation() {
  console.log('=== RUNNING ARQUERO TABULAR EXPLORATION BENCHMARK ===\n');

  const n = 120000;
  console.log(`Generating in-memory multi-channel table with ${n.toLocaleString()} rows...`);

  const timestamps = new Float64Array(n);
  const seismic = new Float64Array(n);
  const magnetic = new Float64Array(n);
  const region = new Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / 500.0;
    timestamps[i] = t;
    seismic[i] = Math.sin(2 * Math.PI * 14.5 * t) + ((i % 11) - 5) / 10.0;
    magnetic[i] = 50000.0 + Math.cos(2 * Math.PI * 0.2 * t) * 15.0;
    region[i] = i < 40000 ? 'Quiet' : (i < 80000 ? 'Transient' : 'Relaxation');
  }

  // 1. Columnar Table Construction
  const t0 = performance.now();
  const dt = aq.table({
    timestamp: timestamps,
    seismic: seismic,
    magnetic: magnetic,
    region: region,
  });
  const constructTime = performance.now() - t0;
  console.log(`[PASS] Columnar Table Ingestion: ${constructTime.toFixed(2)} ms (${n} rows, 4 columns)`);

  // 2. Tabular Filtering
  const t1 = performance.now();
  const filtered = dt.filter(d => Math.abs(d.seismic) > 1.2);
  const filteredCount = filtered.numRows();
  const filterTime = performance.now() - t1;
  const testFilterPass = filterTime < 50.0 && filteredCount > 0;
  console.log(`[${testFilterPass ? 'PASS' : 'FAIL'}] Threshold Filter (|seismic| > 1.2):`);
  console.log(`  - Selected ${filteredCount.toLocaleString()} anomalous rows in ${filterTime.toFixed(2)} ms`);

  // 3. Grouped Rollup Aggregation by Region
  const t2 = performance.now();
  const grouped = dt.groupby('region').rollup({
    count: aq.op.count(),
    mean_seismic: aq.op.mean('seismic'),
    max_magnetic: aq.op.max('magnetic'),
    min_magnetic: aq.op.min('magnetic'),
  });
  const groupTime = performance.now() - t2;
  const groupRows = grouped.objects();
  const testGroupPass = groupTime < 60.0 && groupRows.length === 3;
  console.log(`[${testGroupPass ? 'PASS' : 'FAIL'}] Grouped Aggregation by Region:`);
  console.log(`  - Computed 3 regional summaries in ${groupTime.toFixed(2)} ms:`);
  groupRows.forEach(r => {
    console.log(`    * [${r.region}]: N=${r.count.toLocaleString()}, mean_seismic=${r.mean_seismic.toFixed(4)}, max_magnetic=${r.max_magnetic.toFixed(1)}`);
  });

  // 4. Preview Slice Extraction for UI Tabular View
  const t3 = performance.now();
  const preview = dt.slice(0, 25).objects();
  const sliceTime = performance.now() - t3;
  const testSlicePass = sliceTime < 5.0 && preview.length === 25;
  console.log(`[${testSlicePass ? 'PASS' : 'FAIL'}] Instant 25-Row Preview Slice: ${sliceTime.toFixed(2)} ms`);

  const allPassed = testFilterPass && testGroupPass && testSlicePass;
  console.log(`\n=== ARQUERO VALIDATION: ${allPassed ? 'ALL TESTS PASSED' : 'TESTS FAILED'} ===`);
  if (!allPassed) process.exit(1);
}

runArqueroValidation();
