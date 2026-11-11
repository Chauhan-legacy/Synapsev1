/**
 * SYNAPSE Streaming CSV Parser Client (apps/web/src/utils/streamingCsvParser.ts)
 * 
 * Orchestrates background Web Worker streaming CSV parsing with:
 * - Real-time progress reporting (0-100%)
 * - Immediate task abort/cancellation
 * - Zero-copy Float64Array transfer
 * - Resilient main-thread fallback if workers are blocked
 */

import { SignalData } from '../types/signal';
import { parseUniversalSignalCSV } from './csvParser';
import type { CsvParseProgressPayload, CsvParseCompletePayload } from '../workers/csvWorker';

export interface ParseCsvOptions {
  onProgress?: (progress: CsvParseProgressPayload) => void;
  chunkSize?: number;
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
    // Check if Worker is available
    if (typeof Worker === 'undefined') {
      // Fallback to synchronous parser
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
      worker = new Worker(new URL('../workers/csvWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent) => {
        if (isAborted) return;
        const msg = e.data;

        if (msg.type === 'PROGRESS') {
          if (options?.onProgress) {
            options.onProgress(msg.payload as CsvParseProgressPayload);
          }
        } else if (msg.type === 'COMPLETE') {
          const p = msg.payload as CsvParseCompletePayload;

          // Reconstruct TypedArrays from transferred ArrayBuffers
          const timestamps = Array.from(new Float64Array(p.timestampsBuffer));
          const channels: Record<string, number[]> = {};

          p.channelNames.forEach((name) => {
            const buf = p.channelBuffers[name];
            channels[name] = Array.from(new Float64Array(buf));
          });

          const signal: SignalData = {
            id: `custom_${Date.now()}_${p.filename.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            filename: p.filename,
            samplingRate: p.samplingRate,
            timestamps,
            channels,
            channelNames: p.channelNames,
            duration: p.duration,
            quality: p.quality,
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
        console.warn('CSV Worker error; triggering universal fallback:', err);
        if (worker) {
          worker.terminate();
          worker = null;
        }

        // Graceful fallback
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
      };

      // Dispatch payload
      if (typeof fileOrText === 'string') {
        worker.postMessage({
          type: 'PARSE',
          text: fileOrText,
          filename,
          chunkSize: options?.chunkSize,
        });
      } else {
        worker.postMessage({
          type: 'PARSE',
          file: fileOrText,
          filename,
          chunkSize: options?.chunkSize,
        });
      }
    } catch (err) {
      console.warn('Worker instantiation failed, using fallback:', err);
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
        reader.readAsText(fileOrText);
      }
    }
  });

  return { promise, abort };
}
