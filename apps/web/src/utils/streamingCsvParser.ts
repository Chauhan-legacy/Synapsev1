/**
 * SYNAPSE Ultra-Fast Streaming CSV Ingestion Client
 * (apps/web/src/utils/streamingCsvParser.ts)
 * 
 * Orchestrates background Web Worker streaming CSV parsing with:
 * - ReadableStream chunk decoding via streamIngestWorker
 * - Module-level typed array storage in signalStore (big data kept OUT of React state)
 * - Zero-copy Float64Array ArrayBuffer transfers
 * - Real-time progress updates (~100ms throttle with speed MB/s)
 * - Instant cancellation via worker.terminate()
 * - Automatic data hygiene (BOM stripping, NaN, text strings, empty cells)
 */

import { SignalData, SignalQuality } from '../types/signal';
import { parseUniversalSignalCSV } from './csvParser';
import { signalStore } from '../stores/signalStore';
import type { IngestProgressPayload, IngestCompletePayload } from '../workers/streamIngestWorker';

export interface ParseProgressInfo {
  percent: number;
  rowsParsed: number;
  bytesProcessed: number;
  totalBytes: number;
  speedMBs?: number;
}

export interface ParseCsvOptions {
  onProgress?: (progress: ParseProgressInfo) => void;
  onPreviewReady?: (previewSignal: SignalData) => void;
  samplingRateFallback?: number;
}

export interface ParseHandle {
  promise: Promise<SignalData>;
  abort: () => void;
}

export function parseCsvWithStreamingWorker(
  fileOrText: File | string,
  filename: string,
  options?: ParseCsvOptions
): ParseHandle {
  let worker: Worker | null = null;
  let isAborted = false;

  const abort = () => {
    isAborted = true;
    if (worker) {
      worker.postMessage({ type: 'ABORT' });
      worker.terminate();
      worker = null;
    }
  };

  const promise = new Promise<SignalData>((resolve, reject) => {
    if (typeof Worker === 'undefined' || typeof fileOrText === 'string') {
      // Fallback for strings or worker-less environments
      if (typeof fileOrText === 'string') {
        const parsed = parseUniversalSignalCSV(fileOrText, filename);
        if (parsed) resolve(parsed);
        else reject(new Error('Failed to parse CSV in fallback mode'));
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const parsed = parseUniversalSignalCSV(text, filename);
          if (parsed) resolve(parsed);
          else reject(new Error('Failed to parse CSV in fallback mode'));
        };
        reader.onerror = () => reject(new Error('FileReader error during CSV ingestion'));
        reader.readAsText(fileOrText);
      }
      return;
    }

    try {
      worker = new Worker(new URL('../workers/streamIngestWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent) => {
        if (isAborted) return;
        const msg = e.data;

        if (msg.type === 'PROGRESS') {
          if (options?.onProgress) {
            options.onProgress(msg.payload as IngestProgressPayload);
          }
        } else if (msg.type === 'PREVIEW_READY') {
          // Early preview at ~50k rows: let UI show preview waveforms while rest streams in
          if (options?.onPreviewReady) {
            const prevPayload = msg.payload;
            const prevId = `preview_${Date.now()}`;
            const pTs = new Float64Array(prevPayload.timestampsBuffer);
            const pCh: Record<string, Float64Array> = {};
            prevPayload.channelNames.forEach((name: string) => {
              pCh[name] = new Float64Array(prevPayload.channelBuffers[name]);
            });

            signalStore.set({
              id: prevId,
              filename: `${filename} (Streaming Preview)`,
              timestamps: pTs,
              channels: pCh,
              validityMasks: {},
              channelNames: prevPayload.channelNames,
              rowCount: prevPayload.rowCount,
              samplingRate: options.samplingRateFallback || 200,
              duration: pTs[pTs.length - 1] - pTs[0],
              cheapHash: `preview_${prevPayload.rowCount}`,
              skipSummary: { nanCount: 0, emptyCount: 0, textCount: 0, infCount: 0, totalSkipped: 0 },
            });

            const primary = prevPayload.channelNames[0] || 'Channel 1';
            const decimated = signalStore.getDecimatedSeries(prevId, primary, 2000);
            const previewSignal: SignalData = {
              id: prevId,
              filename: `${filename} (Streaming Preview)`,
              samplingRate: options.samplingRateFallback || 200,
              timestamps: decimated.map((d) => d.time),
              channels: { [primary]: decimated.map((d) => d.value) },
              channelNames: prevPayload.channelNames,
              duration: pTs[pTs.length - 1] - pTs[0],
              quality: {
                total_samples: prevPayload.rowCount,
                channel_count: prevPayload.channelNames.length,
                sampling_rate: options.samplingRateFallback || 200,
                is_uniform: true,
                timestamp_jitter_pct: 0,
                nan_count: 0,
                infinite_count: 0,
                clipping_count: 0,
                content_hash_sha256: `preview_${prevPayload.rowCount}`,
                warnings: ['Rendering live 50k early preview while full dataset finishes streaming.'],
              },
            };
            options.onPreviewReady(previewSignal);
          }
        } else if (msg.type === 'COMPLETE') {
          const p = msg.payload as IngestCompletePayload;

          const signalId = `custom_${Date.now()}_${p.filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

          // Reconstruct TypedArrays from transferred ArrayBuffers (instant zero-copy)
          const timestampsTyped = new Float64Array(p.timestampsBuffer);
          const channelsTyped: Record<string, Float64Array> = {};
          const validityTyped: Record<string, Uint8Array> = {};

          p.channelNames.forEach((name) => {
            const buf = p.channelBuffers[name];
            channelsTyped[name] = new Float64Array(buf);
            const vBuf = p.validityBuffers?.[name];
            if (vBuf) validityTyped[name] = new Uint8Array(vBuf);
          });

          // Fast cheap hash (< 0.05ms)
          const primaryCh = p.channelNames[0] || '';
          const cheapHash = signalStore.computeCheapHash(
            (fileOrText as File).size || p.rowCount * 40,
            p.rowCount,
            timestampsTyped,
            channelsTyped[primaryCh] || timestampsTyped
          );

          // Store heavy multi-megabyte Float64Arrays and validity masks in module-level signalStore
          signalStore.set({
            id: signalId,
            filename: p.filename,
            timestamps: timestampsTyped,
            channels: channelsTyped,
            validityMasks: validityTyped,
            channelNames: p.channelNames,
            rowCount: p.rowCount,
            samplingRate: p.samplingRate,
            duration: p.duration,
            cheapHash,
            skipSummary: p.skipSummary,
          });

          // Prepare light SignalData descriptor for React state
          // For datasets > 10,000 samples, decimate channels to ~2,000 points to keep React state tiny (<20KB)
          // and prevent browser UI thread freezes!
          const timestampsReact: number[] = [];
          const channelsReact: Record<string, number[]> = {};

          if (p.rowCount <= 10000) {
            // Small dataset: store all samples for legacy compatibility
            for (let i = 0; i < p.rowCount; i++) {
              timestampsReact.push(timestampsTyped[i]);
            }
            p.channelNames.forEach((name) => {
              channelsReact[name] = Array.from(channelsTyped[name]);
            });
          } else {
            // Massive dataset (100k - 5M rows):
            // Use peak-preserving Min-Max decimation down to 2,000 points for React state
            const targetPoints = 2000;
            const decimated = signalStore.getDecimatedSeries(signalId, primaryCh, targetPoints);
            for (let i = 0; i < decimated.length; i++) {
              timestampsReact.push(decimated[i].time);
            }
            p.channelNames.forEach((name) => {
              const chDec = signalStore.getDecimatedSeries(signalId, name, targetPoints);
              channelsReact[name] = chDec.map((d) => d.value);
            });
          }

          const warnings: string[] = [];
          if (p.rowCount >= 5000000) {
            warnings.push(
              `Huge dataset tier (${(p.rowCount / 1e6).toFixed(1)}M rows, ~${((p.rowCount * p.channelNames.length * 8) / (1024 * 1024)).toFixed(0)} MB RAM): Multi-resolution pyramid and peak-preserving decimation active.`
            );
          } else if (p.rowCount >= 1000000) {
            warnings.push(
              `Big dataset tier (${(p.rowCount / 1e6).toFixed(1)}M rows, ~${((p.rowCount * p.channelNames.length * 8) / (1024 * 1024)).toFixed(0)} MB RAM): Off-React typed storage and 5-level min/max pyramid active.`
            );
          }

          if (p.skipSummary.totalSkipped > 0) {
            const parts: string[] = [];
            if (p.skipSummary.nanCount > 0) parts.push(`${p.skipSummary.nanCount} NaN`);
            if (p.skipSummary.emptyCount > 0) parts.push(`${p.skipSummary.emptyCount} empty cells`);
            if (p.skipSummary.textCount > 0) parts.push(`${p.skipSummary.textCount} corrupt text values`);
            if (p.skipSummary.infCount > 0) parts.push(`${p.skipSummary.infCount} non-finite/Inf`);
            warnings.push(`Data hygiene: preserved ${parts.join(', ')} with explicit validity masks (interpolated or skipped in analysis).`);
          }

          const quality: SignalQuality = {
            total_samples: p.rowCount,
            channel_count: p.channelNames.length,
            sampling_rate: p.samplingRate,
            is_uniform: true,
            timestamp_jitter_pct: 0,
            nan_count: p.skipSummary.nanCount,
            infinite_count: p.skipSummary.infCount,
            clipping_count: 0,
            content_hash_sha256: cheapHash,
            original_sha256: cheapHash,
            warnings,
            skip_summary: p.skipSummary,
          };

          const signal: SignalData = {
            id: signalId,
            filename: p.filename,
            samplingRate: p.samplingRate,
            timestamps: timestampsReact,
            channels: channelsReact,
            channelNames: p.channelNames,
            duration: p.duration,
            quality,
          };

          if (worker) {
            worker.terminate();
            worker = null;
          }
          resolve(signal);
        } else if (msg.type === 'ERROR') {
          if (worker) {
            worker.terminate();
            worker = null;
          }
          reject(new Error(msg.error || 'CSV Worker encountered an error'));
        } else if (msg.type === 'ABORTED') {
          if (worker) {
            worker.terminate();
            worker = null;
          }
          reject(new Error('CSV parsing was cancelled by user.'));
        }
      };

      worker.onerror = (err) => {
        if (worker) {
          worker.terminate();
          worker = null;
        }
        reject(new Error(`CSV Stream Worker error: ${err.message}`));
      };

      // Launch streaming ingestion
      worker.postMessage({
        type: 'INGEST',
        file: fileOrText as File,
        fileSize: (fileOrText as File).size,
        filename,
        samplingRateFallback: options?.samplingRateFallback || 200.0,
      });
    } catch (err: any) {
      if (worker) {
        try { (worker as Worker).terminate(); } catch { }
        worker = null;
      }
      reject(new Error(`Failed to initialize Web Worker: ${err?.message}`));
    }
  });

  return { promise, abort };
}
