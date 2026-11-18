/**
 * SYNAPSE Scale Benchmark CSV Generator
 * 
 * Generates synthetic multi-channel time-series datasets:
 * - 1k rows
 * - 100k rows
 * - 1M rows
 * - 5M rows
 * 
 * Structure:
 * - timestamp (float, seconds at fs = 200 Hz)
 * - ch1_ecg (synthetic cardiac waveform with P-Q-R-S-T complexes)
 * - ch2_seismic (low frequency modulated oscillatory waveform)
 * - ch3_optical (intermittent chirps + noise)
 * - ch4_geomagnetic (slow diurnal baseline drift + harmonic flares)
 * - Messy cells injected at 0.1% rate: empty cells (,,), NaNs, text ("NaN", "NULL", "CORRUPT"),
 *   occasional whitespace, BOM header, \r\n line endings.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'benchmarks');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function generateBenchmarkCSV(filename, targetRows) {
  const filePath = path.join(OUT_DIR, filename);
  console.log(`[GENERATOR] Creating ${filename} with ${targetRows.toLocaleString()} rows...`);
  const t0 = performance.now();

  const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

  // Include UTF-8 BOM
  writeStream.write('\uFEFF');

  // Header with mixed casing and spacing
  writeStream.write('Timestamp, ch1_ecg, ch2_seismic, ch3_optical, ch4_geomagnetic\r\n');

  const fsRate = 200.0;
  const dt = 1.0 / fsRate;
  const chunkSize = 25000;
  let rowsWritten = 0;

  const messyTypes = [
    'NaN',
    'null',
    '',
    'CORRUPT_TAG',
    '  12.345  ', // trailing/leading spaces
    'INF',
  ];

  while (rowsWritten < targetRows) {
    const toWrite = Math.min(chunkSize, targetRows - rowsWritten);
    let chunkStr = '';

    for (let i = 0; i < toWrite; i++) {
      const idx = rowsWritten + i;
      const t = (idx * dt).toFixed(4);

      // Realistic signals
      // ECG simulation (approximate 1.2 Hz heart rate)
      const phase = (idx % 166) / 166;
      let ecg = Math.sin(2 * Math.PI * phase * 1.2) * 0.15;
      if (phase > 0.45 && phase < 0.55) {
        ecg += 1.8 * Math.exp(-Math.pow((phase - 0.5) * 45, 2)); // R-peak
      }

      // Seismic (15 Hz + 2.5 Hz modulated envelope)
      const seismic = (Math.sin(2 * Math.PI * 15 * idx * dt) * Math.cos(2 * Math.PI * 2.5 * idx * dt)).toFixed(4);

      // Optical (chirp modulated)
      const optical = (Math.sin(2 * Math.PI * (5 + 0.005 * (idx % 2000)) * idx * dt) + 0.05 * Math.sin(idx)).toFixed(4);

      // Geomagnetic (slow drift)
      const geo = (45.2 + 1.2 * Math.cos(2 * Math.PI * idx * dt / 3600) + 0.1 * Math.sin(2 * Math.PI * 0.1 * idx * dt)).toFixed(4);

      // 0.05% messy cell injection
      let v1 = ecg.toFixed(4);
      let v2 = seismic;
      let v3 = optical;
      let v4 = geo;

      if ((idx % 2000) === 7) {
        v1 = messyTypes[idx % messyTypes.length];
      } else if ((idx % 2000) === 42) {
        v2 = ''; // empty cell
      } else if ((idx % 2000) === 99) {
        v3 = 'NaN';
      } else if ((idx % 2000) === 150) {
        v4 = 'ERR_OVERFLOW';
      }

      chunkStr += `${t}, ${v1}, ${v2}, ${v3}, ${v4}\r\n`;
    }

    writeStream.write(chunkStr);
    rowsWritten += toWrite;
  }

  return new Promise((resolve, reject) => {
    writeStream.end(() => {
      const elapsed = performance.now() - t0;
      const stats = fs.statSync(filePath);
      const mb = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`[GENERATOR] Done: ${filename} -> ${mb} MB in ${elapsed.toFixed(1)} ms`);
      resolve({ filePath, sizeBytes: stats.size, sizeMB: mb, rows: targetRows });
    });
    writeStream.on('error', reject);
  });
}

async function runAll() {
  console.log('=== SYNAPSE SCALE BENCHMARK DATA GENERATION ===');
  const res1k = await generateBenchmarkCSV('benchmark_1k.csv', 1000);
  const res100k = await generateBenchmarkCSV('benchmark_100k.csv', 100000);
  const res1m = await generateBenchmarkCSV('benchmark_1m.csv', 1000000);
  const res5m = await generateBenchmarkCSV('benchmark_5m.csv', 5000000);

  console.log('\n[SUMMARY OF GENERATED BENCHMARK DATASETS]');
  console.table([
    { File: 'benchmark_1k.csv', Rows: '1,000', Size: `${res1k.sizeMB} MB` },
    { File: 'benchmark_100k.csv', Rows: '100,000', Size: `${res100k.sizeMB} MB` },
    { File: 'benchmark_1m.csv', Rows: '1,000,000', Size: `${res1m.sizeMB} MB` },
    { File: 'benchmark_5m.csv', Rows: '5,000,000', Size: `${res5m.sizeMB} MB` },
  ]);
}

runAll().catch(console.error);
