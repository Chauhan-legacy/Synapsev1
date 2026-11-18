/**
 * SYNAPSE Module-Level Signal Store (apps/web/src/stores/signalStore.ts)
 * 
 * High-performance off-React data store holding large contiguous TypedArrays (Float64Array).
 * 
 * Architecture Principle:
 * - Big numerical data (100k - 5M+ samples) NEVER lives in React state or context stores.
 * - React state holds ONLY light metadata: { id, filename, channelNames, rowCount, samplingRate, quality, cheapHash }.
 * - Keeps raw NaNs in Float64Array and maintains explicit Uint8Array validity masks (1=valid, 0=NaN/missing).
 * - Multi-resolution 5-level min/max pyramids for instant 4K multi-scale rendering.
 */

import { MultiResolutionPyramid, buildMultiResolutionPyramid, queryPyramid } from '../utils/pyramid';

export interface RawDataset {
  id: string;
  filename: string;
  timestamps: Float64Array;
  channels: Record<string, Float64Array>;
  validityMasks: Record<string, Uint8Array>; // 1 = valid number, 0 = NaN / missing
  channelNames: string[];
  rowCount: number;
  samplingRate: number;
  duration: number;
  cheapHash: string;
  skipSummary: {
    nanCount: number;
    emptyCount: number;
    textCount: number;
    infCount: number;
    totalSkipped: number;
  };
  pyramids?: Record<string, MultiResolutionPyramid>;
}

class SignalDataStore {
  private store: Map<string, RawDataset> = new Map();
  private maxStoredDatasets = 6; // Retain up to 6 datasets in memory

  /**
   * Compute an ultra-fast non-blocking hash (< 0.05 ms) for dataset caching.
   * Combines file size, sample count, and sampled boundary/interior floats.
   */
  public computeCheapHash(
    fileSize: number,
    rowCount: number,
    timestamps: Float64Array,
    primaryChannel: Float64Array
  ): string {
    const n = rowCount;
    if (n === 0) return `empty_${fileSize}`;

    const t0 = timestamps[0] ?? 0;
    const tMid = timestamps[Math.floor(n / 2)] ?? 0;
    const tEnd = timestamps[n - 1] ?? 0;

    const v0 = primaryChannel[0] ?? 0;
    const vMid = primaryChannel[Math.floor(n / 2)] ?? 0;
    const vEnd = primaryChannel[n - 1] ?? 0;

    return `h_${fileSize}_${n}_${t0.toFixed(2)}_${tMid.toFixed(2)}_${tEnd.toFixed(2)}_${v0.toFixed(3)}_${vMid.toFixed(3)}_${vEnd.toFixed(3)}`;
  }

  /**
   * Register a new dataset with zero-copy transferred Float64Arrays and validity masks.
   */
  public set(dataset: RawDataset): void {
    if (this.store.size >= this.maxStoredDatasets) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    // Build multi-resolution pyramid lazily or immediately for primary channels
    if (!dataset.pyramids) {
      dataset.pyramids = {};
      const primary = dataset.channelNames[0];
      if (primary && dataset.channels[primary]) {
        dataset.pyramids[primary] = buildMultiResolutionPyramid(
          dataset.timestamps,
          dataset.channels[primary]
        );
      }
    }

    this.store.set(dataset.id, dataset);
  }

  /**
   * Retrieve raw dataset by ID.
   */
  public get(id: string): RawDataset | undefined {
    return this.store.get(id);
  }

  /**
   * Retrieve raw Float64Array for a channel (contains NaNs as recorded).
   */
  public getChannel(id: string, channelName: string): Float64Array | null {
    const ds = this.store.get(id);
    if (!ds) return null;
    return ds.channels[channelName] || null;
  }

  /**
   * Retrieve validity mask for a channel (1 = valid, 0 = NaN/empty/corrupt).
   */
  public getValidityMask(id: string, channelName: string): Uint8Array | null {
    const ds = this.store.get(id);
    if (!ds) return null;
    return ds.validityMasks?.[channelName] || null;
  }

  /**
   * Retrieve timestamps Float64Array.
   */
  public getTimestamps(id: string): Float64Array | null {
    const ds = this.store.get(id);
    return ds ? ds.timestamps : null;
  }

  /**
   * Delete a dataset from store to free memory immediately.
   */
  public delete(id: string): void {
    this.store.delete(id);
  }

  /**
   * Retrieves a sanitized Float64Array where NaNs are linearly interpolated
   * across gaps for numerical algorithms (FFT, Multitaper, CWT) requiring continuity.
   * Reports the count of interpolated points.
   */
  public getInterpolatedChannel(
    id: string,
    channelName: string,
    maxPoints?: number
  ): { data: Float64Array; interpolatedCount: number } | null {
    const ds = this.store.get(id);
    if (!ds) return null;

    const raw = ds.channels[channelName];
    if (!raw) return null;

    const n = maxPoints ? Math.min(maxPoints, raw.length) : raw.length;
    const out = new Float64Array(n);
    let interpolatedCount = 0;

    let lastValidVal = 0.0;
    // Find first valid value
    for (let i = 0; i < n; i++) {
      if (!isNaN(raw[i])) {
        lastValidVal = raw[i];
        break;
      }
    }

    let i = 0;
    while (i < n) {
      const v = raw[i];
      if (!isNaN(v)) {
        out[i] = v;
        lastValidVal = v;
        i++;
      } else {
        // Gap detected: look ahead for next valid value
        let nextValidIdx = -1;
        let nextValidVal = lastValidVal;
        for (let j = i + 1; j < Math.min(n, i + 500); j++) {
          if (!isNaN(raw[j])) {
            nextValidIdx = j;
            nextValidVal = raw[j];
            break;
          }
        }

        const gapLen = nextValidIdx !== -1 ? nextValidIdx - i + 1 : n - i;
        for (let g = 0; g < gapLen && i < n; g++) {
          const frac = nextValidIdx !== -1 ? g / gapLen : 0;
          out[i] = lastValidVal + frac * (nextValidVal - lastValidVal);
          interpolatedCount++;
          i++;
        }
      }
    }

    return { data: out, interpolatedCount };
  }

  /**
   * Peak-preserving Min-Max decimation utilizing the 5-level pyramid for sub-2ms 4K rendering.
   */
  public getDecimatedSeries(
    id: string,
    channelName: string,
    targetPoints: number = 1000,
    rangeStart?: number,
    rangeEnd?: number,
    pixelWidth: number = 1920
  ): Array<{ time: number; value: number }> {
    const ds = this.store.get(id);
    if (!ds) return [];

    const raw = ds.channels[channelName];
    const ts = ds.timestamps;
    if (!raw || !ts) return [];

    const totalN = ds.rowCount;
    const startIdx = rangeStart !== undefined ? Math.max(0, Math.min(totalN - 1, rangeStart)) : 0;
    const endIdx = rangeEnd !== undefined ? Math.max(startIdx, Math.min(totalN - 1, rangeEnd)) : totalN - 1;

    // Use pre-computed pyramid if available
    let pyr = ds.pyramids?.[channelName];
    if (!pyr && totalN > 50000) {
      pyr = buildMultiResolutionPyramid(ts, raw);
      if (!ds.pyramids) ds.pyramids = {};
      ds.pyramids[channelName] = pyr;
    }

    if (pyr) {
      return queryPyramid(pyr, ts, raw, startIdx, endIdx, pixelWidth);
    }

    // Direct single-pass min-max bucket downsampler
    const visibleCount = endIdx - startIdx + 1;
    if (visibleCount <= targetPoints) {
      const out: Array<{ time: number; value: number }> = new Array(visibleCount);
      for (let i = 0; i < visibleCount; i++) {
        const idx = startIdx + i;
        out[i] = { time: ts[idx], value: isNaN(raw[idx]) ? 0 : raw[idx] };
      }
      return out;
    }

    const bucketCount = Math.floor(targetPoints / 2);
    const bucketSize = Math.max(1, Math.floor(visibleCount / bucketCount));
    const result: Array<{ time: number; value: number }> = [];

    for (let b = 0; b < visibleCount; b += bucketSize) {
      const bStart = startIdx + b;
      const bEnd = Math.min(bStart + bucketSize, endIdx + 1);

      let minVal = raw[bStart];
      let maxVal = raw[bStart];
      let minIdx = bStart;
      let maxIdx = bStart;

      for (let i = bStart + 1; i < bEnd; i++) {
        const v = raw[i];
        if (isNaN(v)) continue;
        if (isNaN(minVal) || v < minVal) {
          minVal = v;
          minIdx = i;
        }
        if (isNaN(maxVal) || v > maxVal) {
          maxVal = v;
          maxIdx = i;
        }
      }

      const safeMin = isNaN(minVal) ? 0 : minVal;
      const safeMax = isNaN(maxVal) ? 0 : maxVal;

      if (minIdx <= maxIdx) {
        result.push({ time: ts[minIdx], value: safeMin });
        if (maxIdx !== minIdx) {
          result.push({ time: ts[maxIdx], value: safeMax });
        }
      } else {
        result.push({ time: ts[maxIdx], value: safeMax });
        result.push({ time: ts[minIdx], value: safeMin });
      }
    }

    return result;
  }
}

export const signalStore = new SignalDataStore();
