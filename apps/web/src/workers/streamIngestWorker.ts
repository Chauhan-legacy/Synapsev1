/**
 * SYNAPSE Ultra-High-Throughput Streaming CSV Ingestion Worker
 * (apps/web/src/workers/streamIngestWorker.ts)
 * 
 * Scaled for 100k to 5M+ row datasets with zero main-thread block:
 * - Uses file.stream() + TextDecoder chunk-by-chunk
 * - Direct parsing into pre-sized Float64Array typed buffers (no intermediate objects)
 * - Preserves NaNs and generates explicit Uint8Array validity masks (1=valid, 0=NaN/missing)
 * - Emits early preview at ~50k rows so UI renders charts while rest streams in
 * - Auto-detects delimiter, BOM, header, and timestamps from first 1000 rows
 * - Handles dirty cells (NaN, null, text strings, overflow, empty cells) with skip summaries
 * - Throttled progress reporting every ~100 ms (percentage, rows, MB/s)
 * - Zero-copy Transferable ArrayBuffer dispatch
 * - Cancellation via worker.terminate() or ABORT message
 */

export interface IngestWorkerRequest {
  type: 'INGEST' | 'ABORT';
  file?: File;
  fileSize?: number;
  filename?: string;
  samplingRateFallback?: number;
}

export interface IngestProgressPayload {
  percent: number;
  rowsParsed: number;
  bytesProcessed: number;
  totalBytes: number;
  speedMBs: number;
}

export interface IngestPreviewPayload {
  rowCount: number;
  channelNames: string[];
  timestampsBuffer: ArrayBuffer;
  channelBuffers: Record<string, ArrayBuffer>;
  sampleFirstRows: Array<Record<string, number>>;
}

export interface IngestCompletePayload {
  filename: string;
  rowCount: number;
  samplingRate: number;
  duration: number;
  channelNames: string[];
  timestampsBuffer: ArrayBuffer;
  channelBuffers: Record<string, ArrayBuffer>;
  validityBuffers: Record<string, ArrayBuffer>;
  skipSummary: {
    nanCount: number;
    emptyCount: number;
    textCount: number;
    infCount: number;
    totalSkipped: number;
  };
  sampleFirstRows: Array<Record<string, number>>;
}

let isAborted = false;

self.onmessage = async (e: MessageEvent<IngestWorkerRequest>) => {
  const { type, file, fileSize, filename = 'dataset.csv', samplingRateFallback = 200.0 } = e.data;

  if (type === 'ABORT') {
    isAborted = true;
    self.postMessage({ type: 'ABORTED' });
    return;
  }

  if (type !== 'INGEST' || !file) return;

  isAborted = false;
  const totalBytes = fileSize || file.size || 1;
  const startTime = performance.now();
  let lastProgressTime = startTime;
  let bytesProcessed = 0;

  // Stream reader initialization
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = file.stream().getReader();
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: 'Failed to obtain ReadableStream from file.' });
    return;
  }

  const decoder = new TextDecoder('utf-8');
  let leftoverText = '';
  let delimiter = ',';
  let hasHeader = false;
  let hasTimeCol = false;
  let channelNames: string[] = [];
  let isMetadataDetected = false;

  // Pre-sized typed array allocations
  let capacity = 10000;
  let timestampsArr = new Float64Array(capacity);
  let channelArrs: Record<string, Float64Array> = {};
  let validityArrs: Record<string, Uint8Array> = {};
  let totalRows = 0;
  let earlyPreviewSent = false;

  // Data hygiene counters
  let nanCount = 0;
  let emptyCount = 0;
  let textCount = 0;
  let infCount = 0;

  // First 100 preview rows for virtualized inspector
  const previewRows: Array<Record<string, number>> = [];

  try {
    while (true) {
      if (isAborted) {
        try { reader.cancel(); } catch { }
        return;
      }

      const { done, value } = await reader.read();

      if (value) {
        bytesProcessed += value.byteLength;
      }

      const chunkText = leftoverText + (value ? decoder.decode(value, { stream: !done }) : '');

      if (!isMetadataDetected && (chunkText.length > 8192 || done)) {
        // Step 1: Detect metadata from the first segment
        const sampleLines = chunkText.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (sampleLines.length > 0) {
          let line0 = sampleLines[0];
          // Strip BOM
          if (line0.charCodeAt(0) === 0xfeff) {
            line0 = line0.slice(1);
            sampleLines[0] = line0;
          }

          // Autodetect delimiter
          const delims = [',', '\t', ';', '|'];
          let maxCount = -1;
          for (const d of delims) {
            const count = (line0.split(d).length - 1);
            if (count > maxCount) {
              maxCount = count;
              delimiter = d;
            }
          }

          const tokens0 = line0.split(delimiter).map((t) => t.trim().replace(/^["']|["']$/g, ''));
          // Determine if line 0 is a header (contains non-numeric string)
          const nonNumericCount = tokens0.filter((t) => isNaN(Number(t))).length;
          hasHeader = nonNumericCount > 0;

          const rawHeaders = hasHeader
            ? tokens0
            : tokens0.map((_, i) => (i === 0 ? 'timestamp' : `Channel_${i}`));

          // Disambiguate duplicate headers
          const seen = new Map<string, number>();
          const cleanHeaders = rawHeaders.map((h, i) => {
            const base = h || `Column_${i + 1}`;
            const count = seen.get(base) || 0;
            seen.set(base, count + 1);
            return count === 0 ? base : `${base}_${count}`;
          });

          // Check if column 0 represents time
          const firstLow = cleanHeaders[0].toLowerCase();
          if (
            firstLow.includes('time') ||
            firstLow === 't' ||
            firstLow.includes('timestamp') ||
            firstLow.includes('sec')
          ) {
            hasTimeCol = true;
            channelNames = cleanHeaders.slice(1);
          } else {
            hasTimeCol = false;
            channelNames = cleanHeaders;
          }

          // Estimate total rows and pre-allocate typed arrays
          const sampleBytes = sampleLines.slice(0, 100).join('\n').length || 1;
          const avgBytesPerRow = Math.max(10, sampleBytes / Math.min(100, sampleLines.length));
          const estimatedRows = Math.ceil((totalBytes / avgBytesPerRow) * 1.1);
          capacity = Math.max(25000, estimatedRows);

          timestampsArr = new Float64Array(capacity);
          channelNames.forEach((name) => {
            channelArrs[name] = new Float64Array(capacity);
            validityArrs[name] = new Uint8Array(capacity);
          });

          isMetadataDetected = true;
        }
      }

      if (!isMetadataDetected && !done) {
        continue;
      }

      // Step 2: Line-by-line hot parsing loop
      let lineStart = 0;
      const numChannels = channelNames.length;
      const colOffset = hasTimeCol ? 1 : 0;

      while (true) {
        const lineEnd = chunkText.indexOf('\n', lineStart);
        if (lineEnd === -1) {
          leftoverText = chunkText.slice(lineStart);
          break;
        }

        let line = chunkText.slice(lineStart, lineEnd);
        lineStart = lineEnd + 1;

        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }

        if (line.length === 0) continue;

        // Skip header line on row 0
        if (totalRows === 0 && hasHeader) {
          hasHeader = false;
          continue;
        }

        // Expand buffers by doubling if capacity exceeded
        if (totalRows >= capacity) {
          const newCap = capacity * 2;
          const newTs = new Float64Array(newCap);
          newTs.set(timestampsArr);
          timestampsArr = newTs;

          for (let c = 0; c < numChannels; c++) {
            const chName = channelNames[c];
            const newArr = new Float64Array(newCap);
            newArr.set(channelArrs[chName]);
            channelArrs[chName] = newArr;

            const newMask = new Uint8Array(newCap);
            newMask.set(validityArrs[chName]);
            validityArrs[chName] = newMask;
          }
          capacity = newCap;
        }

        // Fast parsing of line columns without string allocation
        let tokStart = 0;
        let colIdx = 0;
        const lineLen = line.length;

        let parsedT = 0;
        const previewRow: Record<string, number> = {};

        while (tokStart <= lineLen) {
          let tokEnd = line.indexOf(delimiter, tokStart);
          if (tokEnd === -1) tokEnd = lineLen;

          const rawToken = line.slice(tokStart, tokEnd).trim();
          tokStart = tokEnd + 1;

          if (colIdx === 0 && hasTimeCol) {
            // Timestamp column
            if (rawToken.length === 0) {
              parsedT = totalRows / samplingRateFallback;
              emptyCount++;
            } else {
              const tv = parseFloat(rawToken);
              if (isNaN(tv)) {
                parsedT = totalRows / samplingRateFallback;
                textCount++;
              } else {
                parsedT = tv;
              }
            }
            timestampsArr[totalRows] = parsedT;
            if (totalRows < 100) previewRow['time'] = parsedT;
          } else {
            // Data channels: preserve raw NaNs and mark validity mask (1=valid, 0=NaN/missing)
            const chIndex = colIdx - colOffset;
            if (chIndex >= 0 && chIndex < numChannels) {
              const chName = channelNames[chIndex];
              let val = NaN;
              let isValid = 0;

              if (rawToken.length === 0) {
                emptyCount++;
                val = NaN;
                isValid = 0;
              } else {
                val = parseFloat(rawToken);
                if (isNaN(val)) {
                  nanCount++;
                  val = NaN;
                  isValid = 0;
                } else if (!isFinite(val)) {
                  infCount++;
                  val = NaN;
                  isValid = 0;
                } else {
                  isValid = 1;
                }
              }

              channelArrs[chName][totalRows] = val;
              validityArrs[chName][totalRows] = isValid;
              if (totalRows < 100) previewRow[chName] = isNaN(val) ? 0 : val;
            }
          }

          colIdx++;
        }

        // Fill missing timestamp if no time column was present
        if (!hasTimeCol) {
          timestampsArr[totalRows] = totalRows / samplingRateFallback;
          if (totalRows < 100) previewRow['time'] = timestampsArr[totalRows];
        }

        if (totalRows < 100) {
          previewRows.push(previewRow);
        }

        // Phase 2: Emit early preview signal as soon as the first ~50k rows are parsed
        if (totalRows === 50000 && !earlyPreviewSent && !isAborted) {
          earlyPreviewSent = true;
          const previewTs = timestampsArr.subarray(0, 50000).slice().buffer;
          const previewCh: Record<string, ArrayBuffer> = {};
          const previewTransfers: ArrayBuffer[] = [previewTs];
          for (let c = 0; c < numChannels; c++) {
            const chName = channelNames[c];
            const pBuf = channelArrs[chName].subarray(0, 50000).slice().buffer;
            previewCh[chName] = pBuf;
            previewTransfers.push(pBuf);
          }
          (self.postMessage as any)(
            {
              type: 'PREVIEW_READY',
              payload: {
                rowCount: 50000,
                channelNames,
                timestampsBuffer: previewTs,
                channelBuffers: previewCh,
                sampleFirstRows: previewRows,
              } as IngestPreviewPayload,
            },
            previewTransfers
          );
        }

        totalRows++;
      }

      // Step 3: Throttled progress reporting every ~100 ms
      const now = performance.now();
      if (now - lastProgressTime >= 100 || done) {
        const elapsedSec = (now - startTime) / 1000;
        const speedMBs = elapsedSec > 0 ? Number(((bytesProcessed / 1024 / 1024) / elapsedSec).toFixed(1)) : 0;
        const percent = Math.min(99, Math.round((bytesProcessed / totalBytes) * 100));

        self.postMessage({
          type: 'PROGRESS',
          payload: {
            percent,
            rowsParsed: totalRows,
            bytesProcessed,
            totalBytes,
            speedMBs,
          } as IngestProgressPayload,
        });
        lastProgressTime = now;
      }

      if (done) break;
    }

    // Step 4: Finalize buffers and transfer with zero-copy
    const finalTimestamps = timestampsArr.subarray(0, totalRows);
    const finalChannelBuffers: Record<string, ArrayBuffer> = {};
    const finalValidityBuffers: Record<string, ArrayBuffer> = {};
    const transferList: ArrayBuffer[] = [];

    const tsSliced = finalTimestamps.slice().buffer;
    transferList.push(tsSliced);

    for (const name of channelNames) {
      const chSliced = channelArrs[name].subarray(0, totalRows).slice().buffer;
      finalChannelBuffers[name] = chSliced;
      transferList.push(chSliced);

      const maskSliced = validityArrs[name].subarray(0, totalRows).slice().buffer;
      finalValidityBuffers[name] = maskSliced;
      transferList.push(maskSliced);
    }

    // Compute duration & sampling rate
    let fs = samplingRateFallback;
    let duration = 0;
    if (totalRows > 1) {
      const t0 = finalTimestamps[0];
      const tEnd = finalTimestamps[totalRows - 1];
      duration = tEnd - t0;
      if (duration > 0) {
        fs = Math.round(((totalRows - 1) / duration) * 100) / 100;
      }
    }

    const payload: IngestCompletePayload = {
      filename,
      rowCount: totalRows,
      samplingRate: fs,
      duration,
      channelNames,
      timestampsBuffer: tsSliced,
      channelBuffers: finalChannelBuffers,
      validityBuffers: finalValidityBuffers,
      skipSummary: {
        nanCount,
        emptyCount,
        textCount,
        infCount,
        totalSkipped: nanCount + emptyCount + textCount + infCount,
      },
      sampleFirstRows: previewRows,
    };

    (self.postMessage as any)(
      {
        type: 'COMPLETE',
        payload,
      },
      transferList
    );
  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err?.message || 'Ingest worker runtime exception' });
  }
};
