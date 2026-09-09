import { cinemaWorker } from '../src/lib/cinema-worker';

console.log('[Worker Runner] Starting standalone cinema background worker...');
cinemaWorker.start();

process.on('SIGINT', () => {
  console.log('[Worker Runner] Received SIGINT. Shutting down worker...');
  cinemaWorker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Worker Runner] Received SIGTERM. Shutting down worker...');
  cinemaWorker.stop();
  process.exit(0);
});
