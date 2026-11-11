/**
 * SYNAPSE Hybrid Compute Service (apps/web/src/services/hybridComputeService.ts)
 * 
 * High-level typed API coordinating the browser-side worker compute layer.
 * Enforces the Hybrid Execution Policy:
 * - Browser: Fast preview calculations, interactive statistics, lightweight transformations, Arquero tabular query, ml-matrix PCA preview.
 * - Backend: Authoritative hypothesis testing, multi-taper Thomson F-tests, BOCPD, Granger causality, surrogate null distributions.
 */

import { computePool } from '../workers/workerPool';

export interface DescriptiveStatsResult {
  count: number;
  mean: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  peakToPeak: number;
  skewness: number;
  excessKurtosis: number;
  median: number;
  iqr: number;
  q25: number;
  q75: number;
  p05: number;
  p95: number;
}

export interface PreviewFftResult {
  nFft: number;
  numBins: number;
  peakFreq: number;
  peakPsd: number;
  frequencies: Float64Array;
  psd: Float64Array;
}

export interface PcaPreviewResult {
  channelNames: string[];
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
  eigenvalues: number[];
  eigenvectors: number[][];
  explainedVarianceRatio: number[];
  usedSamples: number;
}

export interface ArqueroSummaryResult {
  totalRows: number;
  columnNames: string[];
  columnSummaries: Record<string, { mean: number; min: number; max: number }>;
  previewRows: Record<string, any>[];
}

/**
 * Computes complete descriptive statistics in background worker using zero-copy Float64Array
 */
export async function computeDescriptiveStatsWorker(
  data: number[] | Float64Array
): Promise<DescriptiveStatsResult> {
  const typedArray = data instanceof Float64Array ? data : new Float64Array(data);
  // Transfer copy of buffer to worker
  const copyBuffer = typedArray.slice().buffer;

  const { promise } = computePool.execute<DescriptiveStatsResult>(
    'DESCRIPTIVE_STATS',
    { buffer: copyBuffer, length: typedArray.length },
    [copyBuffer]
  );

  return promise;
}

/**
 * Computes windowed FFT preview using fft.js in background worker
 */
export async function computePreviewFftWorker(
  data: number[] | Float64Array,
  fs: number,
  windowType: 'hann' | 'hamming' | 'blackman' | 'rectangular' = 'hann'
): Promise<PreviewFftResult> {
  const typedArray = data instanceof Float64Array ? data : new Float64Array(data);
  const copyBuffer = typedArray.slice().buffer;

  const { promise } = computePool.execute<any>(
    'PREVIEW_FFT',
    {
      buffer: copyBuffer,
      length: typedArray.length,
      fs,
      windowType,
    },
    [copyBuffer]
  );

  const raw = await promise;
  return {
    nFft: raw.nFft,
    numBins: raw.numBins,
    peakFreq: raw.peakFreq,
    peakPsd: raw.peakPsd,
    frequencies: new Float64Array(raw.frequenciesBuffer),
    psd: new Float64Array(raw.psdBuffer),
  };
}

/**
 * Preprocesses signal in background worker
 */
export async function preprocessSignalWorker(
  data: number[] | Float64Array,
  mode: 'detrend' | 'zscore' | 'rolling' | 'diff',
  windowSize = 5
): Promise<Float64Array> {
  const typedArray = data instanceof Float64Array ? data : new Float64Array(data);
  const copyBuffer = typedArray.slice().buffer;

  const { promise } = computePool.execute<any>(
    'PREPROCESS',
    {
      buffer: copyBuffer,
      length: typedArray.length,
      mode,
      windowSize,
    },
    [copyBuffer]
  );

  const raw = await promise;
  return new Float64Array(raw.buffer);
}

/**
 * Fast multi-channel tabular exploration and filtering using Arquero in worker
 */
export async function exploreTableWithArquero(
  columns: Record<string, number[]>,
  filterExpr?: string,
  sampleSize = 1000
): Promise<ArqueroSummaryResult> {
  const { promise } = computePool.execute<ArqueroSummaryResult>(
    'ARQUERO_SUMMARY',
    { columns, filterExpr, sampleSize }
  );
  return promise;
}

/**
 * Fast multi-channel covariance & PCA preview using ml-matrix in worker
 */
export async function computePcaPreviewWorker(
  channelNames: string[],
  channels: Record<string, number[] | Float64Array>
): Promise<PcaPreviewResult> {
  const sampleCount = channels[channelNames[0]]?.length || 0;
  const channelBuffers: Record<string, ArrayBuffer> = {};
  const transferList: ArrayBuffer[] = [];

  channelNames.forEach((ch) => {
    const raw = channels[ch];
    const arr = raw instanceof Float64Array ? raw : new Float64Array(raw);
    const buf = arr.slice().buffer;
    channelBuffers[ch] = buf;
    transferList.push(buf);
  });

  const { promise } = computePool.execute<PcaPreviewResult>(
    'MATRIX_PCA',
    {
      channelNames,
      channelBuffers,
      sampleCount,
    },
    transferList
  );

  return promise;
}

