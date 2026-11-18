/**
 * SYNAPSE Baseline Performance Measurement
 * 
 * Simulates current ingestion pipeline:
 * 1. Papa Parse chunk streaming into temporary chunk arrays (number[][])
 * 2. Assembling Float64Array in worker
 * 3. Array.from(new Float64Array(buf)) on main thread (the current streamingCsvParser.ts behavior)
 * 4. React-style state storage simulation
 * 
 * Measures:
 * - Time to ready (ms)
 * - Peak Heap / RSS Memory (MB)
 * - Longest Main-Thread Block (ms)
 */

const fs = require('fs');
const path = require('path');
const Papa = require('../apps/web/node_modules/papaparse');

const BENCH_FILES = [
  { name: '1k rows', file: 'benchmark_1k.csv', rows: 1000 },
  { name: '100k rows', file: 'benchmark_100k.csv', rows: 100000 },
  { name: '1M rows', file: 'benchmark_1m.csv', rows: 1000000 },
  { name: '5M rows', file: 'benchmark_5m.csv', rows: 5000000 },
];

async function measureCurrentPipeline(fileInfo) {
  const filePath = path.join(__dirname, '..', 'data', 'benchmarks', fileInfo.file);
  const fileStats = fs.statSync(filePath);
  const fileBytes = fileStats.size;

  if (global.gc) global.gc();
  const initialMem = process.memoryUsage();

  console.log(`\n--- Benchmarking ${fileInfo.name} (${(fileBytes / 1024 / 1024).toFixed(2)} MB) ---`);
  const tTotalStart = performance.now();

  let maxMainThreadBlock = 0;

  // Step 1: Simulate Worker Papa Parse chunk parsing
  const workerStart = performance.now();
  let rowsParsed = 0;
  const timeChunks = [];
  const channelChunks = {
    ch1: [],
    ch2: [],
    ch3: [],
    ch4: [],
  };

  try {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });

    await new Promise((resolve, reject) => {
      Papa.parse(fileStream, {
        chunkSize: 1024 * 1024,
        skipEmptyLines: true,
        chunk: (results) => {
          const rows = results.data;
          const chunkT = [];
          const c1 = [];
          const c2 = [];
          const c3 = [];
          const c4 = [];

          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r || r.length < 5) continue;
            // Native parseFloat
            chunkT.push(parseFloat(r[0]));
            c1.push(parseFloat(r[1]) || 0);
            c2.push(parseFloat(r[2]) || 0);
            c3.push(parseFloat(r[3]) || 0);
            c4.push(parseFloat(r[4]) || 0);
          }
          rowsParsed += chunkT.length;
          timeChunks.push(chunkT);
          channelChunks.ch1.push(c1);
          channelChunks.ch2.push(c2);
          channelChunks.ch3.push(c3);
          channelChunks.ch4.push(c4);
        },
        complete: resolve,
        error: reject,
      });
    });

    const workerParseTime = performance.now() - workerStart;

    // Step 2: Flatten into Float64Array (Worker complete step)
    const flattenStart = performance.now();
    const timestamps = new Float64Array(rowsParsed);
    let offset = 0;
    for (const chunk of timeChunks) {
      timestamps.set(chunk, offset);
      offset += chunk.length;
    }
    const chBuffers = {};
    for (const ch of ['ch1', 'ch2', 'ch3', 'ch4']) {
      const arr = new Float64Array(rowsParsed);
      let chOff = 0;
      for (const chunk of channelChunks[ch]) {
        arr.set(chunk, chOff);
        chOff += chunk.length;
      }
      chBuffers[ch] = arr.buffer;
    }
    const flattenTime = performance.now() - flattenStart;

    // Step 3: Main thread reconstruction with Array.from() (THE CURRENT BOTTLENECK in streamingCsvParser.ts line 81-87)
    // This directly models what freezes the React UI thread
    const mainThreadStart = performance.now();
    let mainThreadReconstructTime = 0;

    let finalTimestamps;
    const finalChannels = {};

    try {
      finalTimestamps = Array.from(new Float64Array(timestamps.buffer));
      for (const ch of ['ch1', 'ch2', 'ch3', 'ch4']) {
        finalChannels[ch] = Array.from(new Float64Array(chBuffers[ch]));
      }
      mainThreadReconstructTime = performance.now() - mainThreadStart;
      maxMainThreadBlock = mainThreadReconstructTime;
    } catch (oomErr) {
      console.error(`[CRASH] Main-thread Out Of Memory during Array.from on ${fileInfo.name}:`, oomErr.message);
      return {
        name: fileInfo.name,
        rows: fileInfo.rows,
        fileSizeMB: (fileBytes / 1024 / 1024).toFixed(2),
        timeToReadyMs: 'CRASH (OOM)',
        peakMemoryMB: '> 2,048 MB',
        longestMainThreadBlockMs: 'PAGE FREEZE (> 10s)',
        status: 'FAIL (Out of Memory / Freeze)',
      };
    }

    // Step 4: React state clone simulation (setCustomDatasets [...prev, signal])
    const stateStart = performance.now();
    const simulatedReactState = {
      signal: {
        timestamps: finalTimestamps,
        channels: finalChannels,
      }
    };
    const stateTime = performance.now() - stateStart;
    maxMainThreadBlock += stateTime;

    const totalTime = performance.now() - tTotalStart;
    const peakMem = process.memoryUsage();
    const heapUsedMB = ((peakMem.heapUsed - initialMem.heapUsed) / 1024 / 1024).toFixed(1);
    const rssMB = (peakMem.rss / 1024 / 1024).toFixed(1);

    return {
      name: fileInfo.name,
      rows: fileInfo.rows,
      fileSizeMB: (fileBytes / 1024 / 1024).toFixed(2),
      timeToReadyMs: `${totalTime.toFixed(1)} ms`,
      peakMemoryMB: `${rssMB} MB (+${heapUsedMB} MB)`,
      longestMainThreadBlockMs: `${maxMainThreadBlock.toFixed(1)} ms`,
      status: maxMainThreadBlock > 50 ? 'FAIL (> 50ms block)' : 'PASS',
    };

  } catch (err) {
    return {
      name: fileInfo.name,
      rows: fileInfo.rows,
      fileSizeMB: (fileBytes / 1024 / 1024).toFixed(2),
      timeToReadyMs: 'CRASH',
      peakMemoryMB: 'CRASH',
      longestMainThreadBlockMs: err.message,
      status: 'CRASH',
    };
  }
}

async function runBenchmark() {
  console.log('=================================================================');
  console.log('        SYNAPSE CURRENT BASELINE PERFORMANCE BENCHMARK          ');
  console.log('=================================================================');

  const results = [];
  for (const f of BENCH_FILES) {
    const res = await measureCurrentPipeline(f);
    results.push(res);
  }

  console.log('\n=================================================================');
  console.log('                   BASELINE BENCHMARK TABLE                      ');
  console.log('=================================================================');
  console.table(results);
}

runBenchmark().catch(console.error);
