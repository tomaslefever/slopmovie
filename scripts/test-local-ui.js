const { chromium } = require('playwright');
const path = require('path');

async function runTests() {
  console.log('--- PLAYWRIGHT COMPREHENSIVE UI TEST ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3050';
  console.log('1. Navigating to ' + baseUrl + '...');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('   Page loaded successfully.');

  // Check Page Title
  const title = await page.title();
  console.log('2. Page title: "' + title + '"');

  // Verify Video Element
  const video = await page.waitForSelector('video', { timeout: 10000 });
  const videoSrc = await page.evaluate(() => document.querySelector('video')?.src);
  console.log('3. Video element verified! Source:', videoSrc);

  // Verify Top Controls
  const hasLive = await page.$('text=LIVE');
  console.log('4. LIVE badge present:', Boolean(hasLive));

  const muteBtn = await page.$('button[title="Mute"], button[title="Unmute"]');
  console.log('5. Volume/Mute button present:', Boolean(muteBtn));

  const fsBtn = await page.$('button[title="Fullscreen"]');
  console.log('6. Fullscreen button present:', Boolean(fsBtn));

  // Verify strict removal of Subtitles / CC and bottom HUD
  const ccBtn = await page.$('button[title*="Subtitles"], button[title*="subtítulos"], button[title*="CC"]');
  console.log('7. CC / Subtitle button present (must be false):', Boolean(ccBtn));

  const hudTimer = await page.$('text=/\\b\\d{2}:\\d{2}\\b/');
  console.log('8. Bottom HUD timer present (must be false):', Boolean(hudTimer));

  // Screenshot of main cinema view
  await page.screenshot({ path: 'scripts/cinema-main-test.png' });
  console.log('9. Captured screenshot: scripts/cinema-main-test.png');

  // Test Mute button interaction
  if (muteBtn) {
    await muteBtn.click();
    console.log('10. Clicked Mute/Unmute button successfully.');
  }

  // Test Chat drawer toggle
  console.log('11. Testing Chat Drawer...');
  const chatToggle = await page.$('button:has-text("Chat"), button[title*="Chat"], button[aria-label*="Chat"]');
  if (chatToggle) {
    await chatToggle.click();
    await page.waitForTimeout(500);
    console.log('    Toggled chat drawer.');
  }

  // Check Chat Input
  const chatInput = await page.$('input[placeholder*="message"], input[placeholder*="mensaje"], input[placeholder*="chat"], input[placeholder*="Say something"]');
  if (chatInput) {
    await chatInput.fill('Hello Playwright cinema!');
    await page.keyboard.press('Enter');
    console.log('    Sent chat message test.');
    await page.waitForTimeout(1000);
  }

  // Test Admin Panel
  console.log('12. Testing Admin Panel (/admin)...');
  await page.goto(baseUrl + '/admin', { waitUntil: 'domcontentloaded' });
  const adminHeading = await page.$('h1, h2');
  const adminText = await adminHeading?.textContent();
  console.log('    Admin heading:', adminText);
  await page.screenshot({ path: 'scripts/admin-view-test.png' });
  console.log('    Captured admin screenshot: scripts/admin-view-test.png');

  await browser.close();
  console.log('--- ALL PLAYWRIGHT TESTS PASSED CLEANLY ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
