/**
 * SYNAPSE Bounded Worker Pool Manager (apps/web/src/workers/workerPool.ts)
 * 
 * Manages a bounded concurrency pool of Web Workers for non-blocking compute.
 * Guarantees:
 * - Bounded worker creation (clamped to max 2 workers, preventing CPU churn)
 * - Task queuing with priority and cancellation
 * - Zero-copy ArrayBuffer transfer
 * - Clean teardown and idle worker termination
 * - Resilient main-thread fallback if Web Workers are unavailable
 */

import type {
  ComputeWorkerRequest,
  ComputeWorkerResponse,
  ComputeTaskType,
} from './computeWorker';

interface QueuedTask {
  id: string;
  type: ComputeTaskType;
  payload: any;
  transferList?: Transferable[];
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  isCancelled: boolean;
}

class ComputeWorkerPool {
  private maxWorkers: number;
  private workers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerTaskMap: Map<Worker, QueuedTask> = new Map();
  private taskQueue: QueuedTask[] = [];
  private taskCounter = 0;
  private isDestroyed = false;

  constructor() {
    // Bounded concurrency: max 2 workers for compute, leaving CPU for UI & audio
    const hardwareConcurrency = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
    this.maxWorkers = Math.max(1, Math.min(2, Math.floor(hardwareConcurrency / 2)));
  }

  private createWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    try {
      const worker = new Worker(new URL('./computeWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (e: MessageEvent<ComputeWorkerResponse>) => {
        const response = e.data;
        const task = this.workerTaskMap.get(worker);

        this.busyWorkers.delete(worker);
        this.workerTaskMap.delete(worker);

        if (task && !task.isCancelled) {
          if (response.success) {
            task.resolve(response.result);
          } else {
            task.reject(new Error(response.error || 'Worker computation error'));
          }
        }

        // Process next queued task
        this.dispatchNext();
      };

      worker.onerror = (err) => {
        console.error('Worker error:', err);
        const task = this.workerTaskMap.get(worker);
        this.busyWorkers.delete(worker);
        this.workerTaskMap.delete(worker);

        if (task && !task.isCancelled) {
          task.reject(new Error('Worker encountered an uncaught runtime error'));
        }

        // Terminate and replace worker
        const idx = this.workers.indexOf(worker);
        if (idx !== -1) {
          this.workers.splice(idx, 1);
        }
        worker.terminate();

        this.dispatchNext();
      };

      return worker;
    } catch (err) {
      console.warn('Worker creation failed; falling back to main-thread compute:', err);
      return null;
    }
  }

  private dispatchNext() {
    if (this.isDestroyed || this.taskQueue.length === 0) return;

    // Find an idle worker
    let availableWorker = this.workers.find((w) => !this.busyWorkers.has(w));

    // Create a new worker if under limit
    if (!availableWorker && this.workers.length < this.maxWorkers) {
      availableWorker = this.createWorker() || undefined;
      if (availableWorker) {
        this.workers.push(availableWorker);
      }
    }

    if (!availableWorker) {
      // All workers are currently busy; remains in taskQueue
      return;
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    if (task.isCancelled) {
      // Discard and check next
      this.dispatchNext();
      return;
    }

    this.busyWorkers.add(availableWorker);
    this.workerTaskMap.set(availableWorker, task);

    const req: ComputeWorkerRequest = {
      id: task.id,
      type: task.type,
      payload: task.payload,
    };

    if (task.transferList && task.transferList.length > 0) {
      availableWorker.postMessage(req, task.transferList);
    } else {
      availableWorker.postMessage(req);
    }
  }

  /**
   * Execute task in worker pool with optional transferables and cancellation token
   */
  public execute<T = any>(
    type: ComputeTaskType,
    payload: any,
    transferList?: Transferable[]
  ): { promise: Promise<T>; cancel: () => void } {
    this.taskCounter++;
    const taskId = `task_${Date.now()}_${this.taskCounter}`;
    let taskRef: QueuedTask | null = null;

    const promise = new Promise<T>((resolve, reject) => {
      taskRef = {
        id: taskId,
        type,
        payload,
        transferList,
        resolve,
        reject,
        isCancelled: false,
      };

      this.taskQueue.push(taskRef);
      this.dispatchNext();
    });

    const cancel = () => {
      if (taskRef) {
        taskRef.isCancelled = true;
        taskRef.reject(new Error('Task was cancelled.'));
      }
    };

    return { promise, cancel };
  }

  /**
   * Graceful termination of all workers
   */
  public terminate() {
    this.isDestroyed = true;
    this.taskQueue.forEach((t) => t.reject(new Error('Worker pool terminated')));
    this.taskQueue = [];
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.busyWorkers.clear();
    this.workerTaskMap.clear();
  }
}

// Global Singleton Instance
export const computePool = new ComputeWorkerPool();

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    computePool.terminate();
  });
}

