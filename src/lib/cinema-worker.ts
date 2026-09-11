import { acquireOrRenewWorkerLock, releaseWorkerLock } from './supabase/db';
import { cinemaEngine } from './cinema-orchestrator';

/**
 * Singleton Cinema Background Worker.
 * Enforces a SINGLE, FIXED active worker that permanently drives the cinema timeline,
 * regardless of how many movies start, finish, or rotate. Never re-creates per movie.
 */
class CinemaWorker {
  private static instance: CinemaWorker;
  private isRunning: boolean = false;
  private workerId: string = 'worker_cinema_core';
  private interval: NodeJS.Timeout | null = null;
  private isLeader: boolean = false;
  private isBusy: boolean = false;

  public static getInstance(): CinemaWorker {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__cinemaWorkerInstance) {
      return (globalThis as any).__cinemaWorkerInstance;
    }
    if (!CinemaWorker.instance) {
      CinemaWorker.instance = new CinemaWorker();
    }
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__cinemaWorkerInstance = CinemaWorker.instance;
    }
    return CinemaWorker.instance;
  }

  public start() {
    if (typeof globalThis !== 'undefined' && (globalThis as any).__cinemaWorkerStarted && this.isRunning) {
      return;
    }
    if (this.isRunning && this.interval) {
      return;
    }
    this.isRunning = true;
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__cinemaWorkerStarted = true;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log(`[CinemaWorker] 🚀 SINGLE FIXED WORKER (${this.workerId}) active. Managing all continuous movies.`);

    // Run authoritative tick loop
    this.interval = setInterval(async () => {
      if (this.isBusy) return;
      this.isBusy = true;
      try {
        // 1. Leader election check in Supabase database
        const hasLock = await acquireOrRenewWorkerLock(this.workerId);

        if (!hasLock) {
          if (this.isLeader) {
            console.log(`[CinemaWorker] ${this.workerId} lost leadership lock. Standing by.`);
            this.isLeader = false;
          }
          return;
        }

        if (!this.isLeader) {
          console.log(`[CinemaWorker] 👑 ${this.workerId} ACQUIRED LEADER LOCK! Fixed active worker running.`);
          this.isLeader = true;
          // Synchronize from database state before first tick
          await cinemaEngine.syncFromDatabase();
        }

        // 2. Execute single tick
        await cinemaEngine.tickWorker(this.workerId);
      } catch (err) {
        console.error('[CinemaWorker] Error in worker tick:', err);
      } finally {
        this.isBusy = false;
      }
    }, 5000);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__cinemaWorkerStarted = false;
    }
    if (this.isLeader) {
      releaseWorkerLock(this.workerId).catch(() => {});
      this.isLeader = false;
    }
    console.log(`[CinemaWorker] Worker (${this.workerId}) stopped.`);
  }

  public getWorkerId(): string {
    return this.workerId;
  }

  public getIsLeader(): boolean {
    return this.isLeader;
  }
}

export const cinemaWorker = CinemaWorker.getInstance();
