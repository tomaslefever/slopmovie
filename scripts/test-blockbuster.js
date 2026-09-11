const { chromium } = require('playwright');

async function testBlockbusterFlow() {
  console.log('=== STARTING BLOCKBUSTER SELECTION PLAYWRIGHT TEST ===');
  const baseUrl = 'http://localhost:3050';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('1. Loading cinema home page...');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Take screenshot of current state
  await page.screenshot({ path: 'scripts/blockbuster-state-ui.png' });
  console.log('   Screenshot saved: scripts/blockbuster-state-ui.png');

  // Check if either "Next Blockbuster Vote" OR "The Winning Film:" is visible
  const hasVoting = await page.$('text=Next Blockbuster Vote');
  const hasWinner = await page.$('text=The Winning Film:');
  const hasPreProd = await page.$('text=PRE-PRODUCTION & SYNTHESIS');

  console.log('2. UI Indicators:');
  console.log('   - Voting Active:', Boolean(hasVoting));
  console.log('   - Winner Revealed:', Boolean(hasWinner));
  console.log('   - Pre-Production Badge:', Boolean(hasPreProd));

  const isOverlayWorking = Boolean(hasVoting || hasWinner || hasPreProd);
  console.log('3. Blockbuster Movie Selection Overlay is ACTIVE and FUNCTIONAL:', isOverlayWorking);

  if (!isOverlayWorking) {
    throw new Error('Blockbuster overlay is not rendering!');
  }

  await browser.close();
  console.log('=== ALL BLOCKBUSTER TESTS COMPLETED CLEANLY ===');
}

testBlockbusterFlow().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
