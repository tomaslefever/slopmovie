export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { cinemaWorker } = await import('@/lib/cinema-worker');
    cinemaWorker.start();
  }
}
