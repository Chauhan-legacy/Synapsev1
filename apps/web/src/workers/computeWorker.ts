/**
 * SYNAPSE Compute Web Worker (apps/web/src/workers/computeWorker.ts)
 * 
 * Offloads compute-heavy interactive operations from the main React thread:
 * 1. Descriptive statistics & percentiles (transferable Float64Array)
 * 2. Real-time preview FFT & windowed periodogram using fft.js
 * 3. Lightweight signal preprocessing (detrend, z-score, rolling average, difference)
 * 4. Tabular exploration & group aggregations using Arquero
 * 5. Multi-channel covariance & PCA previews using ml-matrix
 */

import FFT from 'fft.js';
import * as aq from 'arquero';
import { Matrix, EigenvalueDecomposition } from 'ml-matrix';

export type ComputeTaskType =
  | 'DESCRIPTIVE_STATS'
  | 'PREVIEW_FFT'
  | 'PREPROCESS'
  | 'ARQUERO_SUMMARY'
  | 'MATRIX_PCA';

export interface ComputeWorkerRequest {
  id: string;
  type: ComputeTaskType;
  payload: any;
}

export interface ComputeWorkerResponse {
  id: string;
  type: ComputeTaskType;
  success: boolean;
  result?: any;
  error?: string;
  executionTimeMs: number;
}

self.onmessage = (e: MessageEvent<ComputeWorkerRequest>) => {
  const { id, type, payload } = e.data;
  const t0 = performance.now();

  try {
    switch (type) {
      case 'DESCRIPTIVE_STATS': {
        // payload: { buffer: ArrayBuffer, length: number }
        const data = new Float64Array(payload.buffer, 0, payload.length);
        const n = data.length;
        if (n === 0) {
          throw new Error('Cannot compute stats on empty array');
        }

        let sum = 0.0;
        let min = data[0];
        let max = data[0];

        for (let i = 0; i < n; i++) {
          const v = data[i];
          sum += v;
          if (v < min) min = v;
          if (v > max) max = v;
        }

        const mean = sum / n;
        let sumSqDiff = 0.0;
        let m3 = 0.0;
        let m4 = 0.0;

        for (let i = 0; i < n; i++) {
          const diff = data[i] - mean;
          const diff2 = diff * diff;
          sumSqDiff += diff2;
          m3 += diff2 * diff;
          m4 += diff2 * diff2;
        }

        const variance = n > 1 ? sumSqDiff / (n - 1) : 0.0;
        const std = Math.sqrt(variance);

        // Skewness & Kurtosis
        let skewness = 0.0;
        let excessKurtosis = 0.0;
        if (std > 1e-12 && n > 2) {
          const s3 = std * std * std;
          const s4 = std * std * std * std;
          skewness = (m3 / n) / s3;
          excessKurtosis = (m4 / n) / s4 - 3.0;
        }

        // Percentiles via quick partial sort or typed array copy
        const sorted = new Float64Array(data);
        sorted.sort();

        const getPercentile = (p: number) => {
          const idx = (p / 100) * (n - 1);
          const low = Math.floor(idx);
          const high = Math.ceil(idx);
          const weight = idx - low;
          return sorted[low] * (1 - weight) + sorted[high] * weight;
        };

        const median = getPercentile(50);
        const q25 = getPercentile(25);
        const q75 = getPercentile(75);
        const p05 = getPercentile(5);
        const p95 = getPercentile(95);
        const iqr = q75 - q25;

        const result = {
          count: n,
          mean,
          std,
          variance,
          min,
          max,
          peakToPeak: max - min,
          skewness,
          excessKurtosis,
          median,
          iqr,
          q25,
          q75,
          p05,
          p95,
        };

        const executionTimeMs = performance.now() - t0;
        const response: ComputeWorkerResponse = {
          id,
          type,
          success: true,
          result,
          executionTimeMs,
        };
        // Transfer back the original buffer to main thread
        (self.postMessage as any)(response, [payload.buffer]);
        break;
      }

      case 'PREVIEW_FFT': {
        // payload: { buffer: ArrayBuffer, length: number, fs: number, windowType?: 'hann'|'hamming'|'blackman'|'rectangular' }
        const { fs, windowType = 'hann' } = payload;
        const rawData = new Float64Array(payload.buffer, 0, payload.length);
        const n = rawData.length;

        // Choose next lower or equal power of 2 (up to 65,536 for interactive preview)
        let nFft = 1;
        while (nFft * 2 <= Math.min(n, 65536)) {
          nFft *= 2;
        }
        if (nFft < 8) nFft = 8;

        // Create window function
        const windowWeights = new Float64Array(nFft);
        let winSumSq = 0.0;

        for (let i = 0; i < nFft; i++) {
          let w = 1.0;
          if (windowType === 'hann') {
            w = 0.5 * (1.0 - Math.cos((2 * Math.PI * i) / (nFft - 1)));
          } else if (windowType === 'hamming') {
            w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (nFft - 1));
          } else if (windowType === 'blackman') {
            w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (nFft - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (nFft - 1));
          }
          windowWeights[i] = w;
          winSumSq += w * w;
        }

        // Detrend mean and window input
        let segmentMean = 0.0;
        for (let i = 0; i < nFft; i++) segmentMean += rawData[i];
        segmentMean /= nFft;

        const fft = new FFT(nFft);
        const complexInput = fft.createComplexArray() as Float64Array;
        for (let i = 0; i < nFft; i++) {
          complexInput[2 * i] = (rawData[i] - segmentMean) * windowWeights[i];
          complexInput[2 * i + 1] = 0.0;
        }

        const complexOutput = fft.createComplexArray() as Float64Array;
        fft.transform(complexOutput, complexInput);

        const numBins = Math.floor(nFft / 2) + 1;
        const frequencies = new Float64Array(numBins);
        const psd = new Float64Array(numBins);
        const normFactor = 2.0 / (fs * (winSumSq || 1.0));

        let peakFreq = 0.0;
        let peakPsd = 0.0;

        for (let k = 0; k < numBins; k++) {
          const re = complexOutput[2 * k];
          const im = complexOutput[2 * k + 1];
          const magSq = re * re + im * im;
          let p = magSq * normFactor;
          if (k === 0 || k === numBins - 1) {
            p *= 0.5; // DC and Nyquist single-sided correction
          }
          const freq = (k * fs) / nFft;
          frequencies[k] = freq;
          psd[k] = p;

          if (k > 0 && p > peakPsd) {
            peakPsd = p;
            peakFreq = freq;
          }
        }

        const executionTimeMs = performance.now() - t0;
        const result = {
          nFft,
          numBins,
          peakFreq,
          peakPsd,
          frequenciesBuffer: frequencies.buffer,
          psdBuffer: psd.buffer,
        };

        const response: ComputeWorkerResponse = {
          id,
          type,
          success: true,
          result,
          executionTimeMs,
        };

        // Transfer frequencies and psd typed arrays back zero-copy
        (self.postMessage as any)(response, [payload.buffer, frequencies.buffer, psd.buffer]);
        break;
      }

      case 'PREPROCESS': {
        // payload: { buffer: ArrayBuffer, length: number, mode: 'detrend' | 'zscore' | 'rolling' | 'diff', windowSize?: number }
        const { mode, windowSize = 5 } = payload;
        const src = new Float64Array(payload.buffer, 0, payload.length);
        const n = src.length;
        const out = new Float64Array(n);

        if (mode === 'detrend') {
          // Linear least-squares detrend
          let sumT = 0, sumY = 0, sumTY = 0, sumT2 = 0;
          for (let i = 0; i < n; i++) {
            sumT += i;
            sumY += src[i];
            sumTY += i * src[i];
            sumT2 += i * i;
          }
          const denom = n * sumT2 - sumT * sumT;
          const slope = denom !== 0 ? (n * sumTY - sumT * sumY) / denom : 0;
          const intercept = (sumY - slope * sumT) / n;
          for (let i = 0; i < n; i++) {
            out[i] = src[i] - (slope * i + intercept);
          }
        } else if (mode === 'zscore') {
          let sum = 0;
          for (let i = 0; i < n; i++) sum += src[i];
          const mean = sum / n;
          let sqDiff = 0;
          for (let i = 0; i < n; i++) {
            const d = src[i] - mean;
            sqDiff += d * d;
          }
          const std = Math.sqrt(sqDiff / (n || 1)) || 1.0;
          for (let i = 0; i < n; i++) {
            out[i] = (src[i] - mean) / std;
          }
        } else if (mode === 'diff') {
          out[0] = 0;
          for (let i = 1; i < n; i++) {
            out[i] = src[i] - src[i - 1];
          }
        } else if (mode === 'rolling') {
          const w = Math.max(1, windowSize);
          let currentSum = 0;
          for (let i = 0; i < Math.min(w, n); i++) {
            currentSum += src[i];
            out[i] = currentSum / (i + 1);
          }
          for (let i = w; i < n; i++) {
            currentSum += src[i] - src[i - w];
            out[i] = currentSum / w;
          }
        }

        const executionTimeMs = performance.now() - t0;
        (self.postMessage as any)(
          {
            id,
            type,
            success: true,
            result: { mode, buffer: out.buffer, length: n },
            executionTimeMs,
          },
          [payload.buffer, out.buffer]
        );
        break;
      }

      case 'ARQUERO_SUMMARY': {
        // payload: { columns: Record<string, number[]> }
        // Evaluate Arquero for tabular slicing, group-by, filtering, and summary statistics
        const { columns, filterExpr, sampleSize = 1000 } = payload;
        const dt = aq.from(columns);

        let activeDt = dt;
        if (filterExpr) {
          try {
            // Safe filter evaluation
            activeDt = dt.filter(aq.escape(filterExpr));
          } catch {
            // Keep original if filter syntax error
          }
        }

        const rowCount = activeDt.numRows();
        const colNames = activeDt.columnNames();
        const columnSummaries: Record<string, any> = {};

        colNames.forEach((col) => {
          const colData = activeDt.array(col);
          let sum = 0, min = Infinity, max = -Infinity;
          const len = colData.length;
          for (let i = 0; i < len; i++) {
            const v = Number(colData[i]);
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
          }
          columnSummaries[col] = {
            mean: len > 0 ? sum / len : 0,
            min: min === Infinity ? 0 : min,
            max: max === -Infinity ? 0 : max,
          };
        });

        const previewRows = activeDt.slice(0, Math.min(sampleSize, 50)).objects();

        const executionTimeMs = performance.now() - t0;
        self.postMessage({
          id,
          type,
          success: true,
          result: {
            totalRows: rowCount,
            columnNames: colNames,
            columnSummaries,
            previewRows,
          },
          executionTimeMs,
        });
        break;
      }

      case 'MATRIX_PCA': {
        // payload: { channelNames: string[], channelBuffers: Record<string, ArrayBuffer>, sampleCount: number }
        // Fast multi-channel covariance matrix & PCA preview using ml-matrix
        const { channelNames, channelBuffers, sampleCount } = payload;
        const k = channelNames.length;
        if (k < 2) {
          throw new Error('PCA requires at least 2 channels');
        }

        const dataMatrix: number[][] = [];
        // Downsample for preview if sampleCount > 10,000 to keep preview sub-5ms
        const step = Math.max(1, Math.floor(sampleCount / 10000));
        const usedSamples = Math.floor(sampleCount / step);

        for (let i = 0; i < usedSamples; i++) {
          dataMatrix.push(new Array(k));
        }

        const means: number[] = new Array(k).fill(0);
        channelNames.forEach((ch: string, c: number) => {
          const arr = new Float64Array(channelBuffers[ch], 0, sampleCount);
          let sum = 0;
          for (let i = 0; i < usedSamples; i++) {
            const v = arr[i * step];
            dataMatrix[i][c] = v;
            sum += v;
          }
          means[c] = sum / usedSamples;
        });

        // Center matrix
        for (let i = 0; i < usedSamples; i++) {
          for (let c = 0; c < k; c++) {
            dataMatrix[i][c] -= means[c];
          }
        }

        const X = new Matrix(dataMatrix);
        // Covariance = (X^T * X) / (N - 1)
        const cov = X.transpose().mmul(X).div(usedSamples - 1);
        const covArray = cov.to2DArray();

        // Correlation matrix
        const stds = new Array(k);
        for (let c = 0; c < k; c++) {
          stds[c] = Math.sqrt(covArray[c][c]) || 1.0;
        }
        const corrArray: number[][] = [];
        for (let r = 0; r < k; r++) {
          corrArray.push(new Array(k));
          for (let c = 0; c < k; c++) {
            corrArray[r][c] = covArray[r][c] / (stds[r] * stds[c]);
          }
        }

        // Eigenvalue decomposition of Correlation Matrix
        const corrMatrix = new Matrix(corrArray);
        const eig = new EigenvalueDecomposition(corrMatrix);
        const realEigenvalues = eig.realEigenvalues;
        const eigenvectorMatrix = eig.eigenvectorMatrix.to2DArray();

        // Explained variance ratio
        let sumEig = 0;
        for (let i = 0; i < k; i++) sumEig += Math.max(0, realEigenvalues[i]);
        const explainedVarianceRatio = realEigenvalues.map((ev) => (sumEig > 0 ? Math.max(0, ev) / sumEig : 0));

        const executionTimeMs = performance.now() - t0;
        self.postMessage({
          id,
          type,
          success: true,
          result: {
            channelNames,
            covarianceMatrix: covArray,
            correlationMatrix: corrArray,
            eigenvalues: Array.from(realEigenvalues),
            eigenvectors: eigenvectorMatrix,
            explainedVarianceRatio,
            usedSamples,
          },
          executionTimeMs,
        });
        break;
      }

      default:
        throw new Error(`Unsupported compute worker task: ${type}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type,
      success: false,
      error: err.message || String(err),
      executionTimeMs: performance.now() - t0,
    });
  }
};
