import { CommonResultSchema } from '../types/analysis';

const DB_NAME = 'synapse_analysis_cache_v2';
const STORE_NAME = 'module_results';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not supported'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export interface CachedModuleResultEntry {
  cacheKey: string;
  resultsByModule: Record<string, CommonResultSchema[]>;
  timestamp: number;
}

// In-memory hot layer
const memoryCache = new Map<string, Record<string, CommonResultSchema[]>>();

export async function getCachedAnalysisResults(
  cacheKey: string
): Promise<Record<string, CommonResultSchema[]> | null> {
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cacheKey);
      req.onsuccess = () => {
        if (req.result && req.result.resultsByModule) {
          memoryCache.set(cacheKey, req.result.resultsByModule);
          resolve(req.result.resultsByModule);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedAnalysisResults(
  cacheKey: string,
  resultsByModule: Record<string, CommonResultSchema[]>
): Promise<void> {
  memoryCache.set(cacheKey, resultsByModule);
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: CachedModuleResultEntry = {
      cacheKey,
      resultsByModule,
      timestamp: Date.now(),
    };
    store.put(entry);
  } catch (err) {
    // Non-critical background failure (e.g. private browsing or quota limit)
    console.warn('[SYNAPSE Cache] IndexedDB write skipped:', err);
  }
}

export function clearMemoryAnalysisCache(): void {
  memoryCache.clear();
}
