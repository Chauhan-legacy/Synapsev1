/**
 * SYNAPSE Main-Thread Watchdog
 * Monitors frame intervals on the main UI thread.
 * Flags any execution blocking the UI event loop for > 100ms.
 */

interface WatchdogStats {
  longestBlockMs: number;
  blockCount: number;
  totalBlocksDurationMs: number;
  lastBlockAt: number | null;
  history: Array<{ durationMs: number; timestamp: number }>;
}

const stats: WatchdogStats = {
  longestBlockMs: 0,
  blockCount: 0,
  totalBlocksDurationMs: 0,
  lastBlockAt: null,
  history: [],
};

let isRunning = false;
let lastTick = performance.now();
const TARGET_FRAME_MS = 16.67;
const BLOCK_THRESHOLD_MS = 100.0;

function tick() {
  if (!isRunning) return;
  const now = performance.now();
  const delta = now - lastTick;

  // If elapsed time between scheduled animation frames is > 100ms, main thread was blocked
  if (delta > BLOCK_THRESHOLD_MS) {
    const blockDuration = delta - TARGET_FRAME_MS;
    stats.blockCount++;
    stats.totalBlocksDurationMs += blockDuration;
    if (blockDuration > stats.longestBlockMs) {
      stats.longestBlockMs = blockDuration;
    }
    stats.lastBlockAt = now;
    stats.history.push({ durationMs: blockDuration, timestamp: now });
    if (stats.history.length > 50) stats.history.shift();

    if (process.env.NODE_ENV !== 'production' || (import.meta as any).env?.DEV) {
      console.warn(
        `[SYNAPSE WATCHDOG] Main thread blocked for ${blockDuration.toFixed(1)} ms! (Threshold: ${BLOCK_THRESHOLD_MS} ms)`
      );
    }
  }

  lastTick = now;
  requestAnimationFrame(tick);
}

export function startMainThreadWatchdog(): void {
  if (isRunning) return;
  isRunning = true;
  lastTick = performance.now();
  requestAnimationFrame(tick);
}

export function stopMainThreadWatchdog(): void {
  isRunning = false;
}

export function getMainThreadWatchdogStats(): WatchdogStats {
  return { ...stats, history: [...stats.history] };
}

export function resetMainThreadWatchdogStats(): void {
  stats.longestBlockMs = 0;
  stats.blockCount = 0;
  stats.totalBlocksDurationMs = 0;
  stats.lastBlockAt = null;
  stats.history = [];
}
