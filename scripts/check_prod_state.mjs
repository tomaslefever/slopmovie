import fs from 'fs';

async function checkProductionState() {
  console.log('--- 1. Testing https://slopmovie.online/api/cinema/state ---');
  try {
    const res = await fetch('https://slopmovie.online/api/cinema/state', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log('Phase:', data.phase);
    console.log('Current Step:', data.currentStep);
    console.log('Is Worker Active:', data.isWorkerActive);
    console.log('Movie Title:', data.movie?.title);
    console.log('Active Scene Video:', data.activeScene?.videoUrl ? 'HAS_VIDEO' : 'NO_VIDEO');
    console.log('Active Scene Reference Video:', data.activeScene?.referenceVideoUrl ? 'HAS_REF' : 'NO_REF');
    console.log('Active Scene Options:', data.activeScene?.options?.length);
    console.log('Steps count in movie:', data.movie?.steps?.length);
    console.log('Last Error / Meta:', JSON.stringify(data.meta || {}));
  } catch (e) {
    console.log('Error fetching state:', e.message);
  }

  console.log('\n--- 2. Testing http://69.62.101.90:3000/api/cinema/state ---');
  try {
    const res2 = await fetch('http://69.62.101.90:3000/api/cinema/state', {
      signal: AbortSignal.timeout(10000)
    });
    console.log(`Status: ${res2.status}`);
    const data2 = await res2.json();
    console.log('Phase:', data2.phase);
    console.log('Current Step:', data2.currentStep);
  } catch (e) {
    console.log('Error fetching IP state:', e.message);
  }
}

checkProductionState();
