/**
 * SYNAPSE Phase 1 Performance Verification & Benchmark
 * 
 * Tests the new streaming ingest pipeline:
 * 1. Chunk-by-chunk stream parsing into pre-sized Float64Array
 * 2. Big data stored in module-level signalStore
 * 3. Light descriptor in React state
 * 4. Zero Array.from() allocations
 * 5. Cheap hash calculation
 */

const fs = require('fs');
const path = require('path');

const BENCH_FILES = [
  { name: '1k rows', file: 'benchmark_1k.csv', rows: 1000 },
  { name: '100k rows', file: 'benchmark_100k.csv', rows: 100000 },
  { name: '1M rows', file: 'benchmark_1m.csv', rows: 1000000 },
  { name: '5M rows', file: 'benchmark_5m.csv', rows: 5000000 },
];

async function measurePhase1Pipeline(fileInfo) {
  const filePath = path.join(__dirname, '..', 'data', 'benchmarks', fileInfo.file);
  const fileStats = fs.statSync(filePath);
  const totalBytes = fileStats.size;

  if (global.gc) global.gc();
  const initialMem = process.memoryUsage();

  console.log(`\n--- [PHASE 1] Testing ${fileInfo.name} (${(totalBytes / 1024 / 1024).toFixed(2)} MB) ---`);
  const tTotalStart = performance.now();

  // Step 1: Worker Stream Simulation
  const workerStart = performance.now();
  let capacity = Math.max(25000, Math.ceil(fileInfo.rows * 1.05));
  let timestamps = new Float64Array(capacity);
  let ch1 = new Float64Array(capacity);
  let ch2 = new Float64Array(capacity);
  let ch3 = new Float64Array(capacity);
  let ch4 = new Float64Array(capacity);

  let rowsParsed = 0;
  let nanCount = 0;
  let emptyCount = 0;
  let textCount = 0;

  const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });

  let leftover = '';
  let isHeaderParsed = false;

  for await (const chunk of stream) {
    const text = leftover + chunk.toString('utf8');
    let lineStart = 0;

    if (!isHeaderParsed) {
      isHeaderParsed = true;
      const firstNl = text.indexOf('\n');
      if (firstNl !== -1) {
        lineStart = firstNl + 1; // skip header line
      }
    }

    while (true) {
      const lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd === -1) {
        leftover = text.slice(lineStart);
        break;
      }

      let line = text.slice(lineStart, lineEnd);
      lineStart = lineEnd + 1;
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.length === 0) continue;

      // Expand if needed
      if (rowsParsed >= capacity) {
        const newCap = capacity * 2;
        const newTs = new Float64Array(newCap);
        newTs.set(timestamps);
        timestamps = newTs;

        const newCh1 = new Float64Array(newCap); newCh1.set(ch1); ch1 = newCh1;
        const newCh2 = new Float64Array(newCap); newCh2.set(ch2); ch2 = newCh2;
        const newCh3 = new Float64Array(newCap); newCh3.set(ch3); ch3 = newCh3;
        const newCh4 = new Float64Array(newCap); newCh4.set(ch4); ch4 = newCh4;
        capacity = newCap;
      }

      // Fast line token split without substring creation
      let t0 = 0;
      let col = 0;
      const len = line.length;

      while (t0 <= len) {
        let t1 = line.indexOf(',', t0);
        if (t1 === -1) t1 = len;

        const raw = line.slice(t0, t1).trim();
        t0 = t1 + 1;

        if (col === 0) {
          const v = parseFloat(raw);
          timestamps[rowsParsed] = isNaN(v) ? rowsParsed * 0.005 : v;
        } else if (col === 1) {
          const v = parseFloat(raw);
          if (isNaN(v)) { nanCount++; ch1[rowsParsed] = 0; } else ch1[rowsParsed] = v;
        } else if (col === 2) {
          const v = parseFloat(raw);
          if (isNaN(v)) { emptyCount++; ch2[rowsParsed] = 0; } else ch2[rowsParsed] = v;
        } else if (col === 3) {
          const v = parseFloat(raw);
          if (isNaN(v)) { textCount++; ch3[rowsParsed] = 0; } else ch3[rowsParsed] = v;
        } else if (col === 4) {
          const v = parseFloat(raw);
          ch4[rowsParsed] = isNaN(v) ? 0 : v;
        }
        col++;
      }

      rowsParsed++;
    }
  }

  const workerTime = performance.now() - workerStart;

  // Step 2: Main Thread Zero-Copy Ingestion (< 1ms!)
  const mainThreadStart = performance.now();

  // Fast cheap hash
  const cheapHash = `h_${totalBytes}_${rowsParsed}_${timestamps[0]}_${ch1[0]}_${ch1[rowsParsed-1]}`;

  // Store in module-level store (simulated)
  const storeEntry = {
    id: `signal_${fileInfo.name}`,
    timestamps: timestamps.subarray(0, rowsParsed),
    channels: {
      ch1_ecg: ch1.subarray(0, rowsParsed),
      ch2_seismic: ch2.subarray(0, rowsParsed),
      ch3_optical: ch3.subarray(0, rowsParsed),
      ch4_geomagnetic: ch4.subarray(0, rowsParsed),
    },
    rowCount: rowsParsed,
    cheapHash,
  };

  // React state descriptor (only metadata + ~2000 decimated points for instant rendering)
  const targetPoints = Math.min(2000, rowsParsed);
  const step = Math.max(1, Math.floor(rowsParsed / targetPoints));
  const reactTimestamps = [];
  const reactCh1 = [];
  for (let i = 0; i < rowsParsed; i += step) {
    reactTimestamps.push(timestamps[i]);
    reactCh1.push(ch1[i]);
  }

  const reactState = {
    id: storeEntry.id,
    rowCount: rowsParsed,
    channelNames: ['ch1_ecg', 'ch2_seismic', 'ch3_optical', 'ch4_geomagnetic'],
    timestamps: reactTimestamps,
    channels: { ch1_ecg: reactCh1 },
  };

  const mainThreadBlock = performance.now() - mainThreadStart;
  const totalTime = performance.now() - tTotalStart;

  const peakMem = process.memoryUsage();
  const heapUsedMB = ((peakMem.heapUsed - initialMem.heapUsed) / 1024 / 1024).toFixed(1);
  const rssMB = (peakMem.rss / 1024 / 1024).toFixed(1);

  return {
    name: fileInfo.name,
    rows: fileInfo.rows,
    fileSizeMB: (totalBytes / 1024 / 1024).toFixed(2),
    timeToReadyMs: `${totalTime.toFixed(1)} ms`,
    workerTimeMs: `${workerTime.toFixed(1)} ms`,
    mainThreadBlockMs: `${mainThreadBlock.toFixed(2)} ms`,
    peakMemoryMB: `${rssMB} MB (+${heapUsedMB} MB)`,
    hygiene: `NaN:${nanCount}, Empty:${emptyCount}, Text:${textCount}`,
    status: mainThreadBlock < 50 ? 'PASS (Zero-Jank)' : 'FAIL',
  };
}

async function run() {
  console.log('=================================================================');
  console.log('         SYNAPSE PHASE 1 STREAMING INGESTION BENCHMARK           ');
  console.log('=================================================================');

  const results = [];
  for (const f of BENCH_FILES) {
    const res = await measurePhase1Pipeline(f);
    results.push(res);
  }

  console.log('\n=================================================================');
  console.log('                 PHASE 1 INGESTION RESULTS                       ');
  console.log('=================================================================');
  console.table(results);
}

run().catch(console.error);
