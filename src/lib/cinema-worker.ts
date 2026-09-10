import { acquireOrRenewWorkerLock, releaseWorkerLock } from './supabase/db';
import { cinemaEngine } from './cinema-orchestrator';

/**
 * Singleton Cinema Background Worker.
 * Enforces a SINGLE active worker across all processes via database leader election.
 * Only the worker holding the heartbeat lock in Supabase cinema_state executes transitions.
 */
class CinemaWorker {
  private static instance: CinemaWorker;
  private isRunning: boolean = false;
  private workerId: string = 'worker_' + Math.random().toString(36).substring(2, 9);
  private interval: NodeJS.Timeout | null = null;
  private isLeader: boolean = false;

  public static getInstance(): CinemaWorker {
    if (!CinemaWorker.instance) {
      CinemaWorker.instance = new CinemaWorker();
    }
    return CinemaWorker.instance;
  }

  private isBusy: boolean = false;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[CinemaWorker] Starting background worker (${this.workerId})...`);

    // Run tick every 5000ms (reduced from 1000ms to conserve database/realtime egress)
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
          console.log(`[CinemaWorker] ${this.workerId} ACQUIRED LEADER LOCK! Active worker running.`);
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
