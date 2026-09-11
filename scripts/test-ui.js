const { chromium } = require('playwright');

async function testUI() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test deployed server
  const targetUrl = 'http://69.62.101.90:3000';
  console.log('Navigating to ' + targetUrl + '...');
  
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Page loaded successfully!');

    // Check page title
    const title = await page.title();
    console.log('Page title:', title);

    // Wait for video element
    const video = await page.waitForSelector('video', { timeout: 15000 });
    console.log('Video element found:', Boolean(video));

    // Check LIVE indicator
    const liveText = await page.textContent('body');
    const hasLive = liveText.includes('LIVE');
    console.log('Has LIVE badge:', hasLive);

    // Check that there are NO subtitle elements or CC button
    const ccButton = await page.$('button[title*="Subtitles"], button[title*="subtítulos"], button[title*="CC"]');
    console.log('CC / Subtitles button present (should be false/null):', Boolean(ccButton));

    // Check for volume and fullscreen buttons
    const muteBtn = await page.$('button[title="Mute"], button[title="Unmute"]');
    const fsBtn = await page.$('button[title="Fullscreen"]');
    console.log('Mute button present:', Boolean(muteBtn));
    console.log('Fullscreen button present:', Boolean(fsBtn));

    // Take screenshot of cinema stage
    await page.screenshot({ path: 'scripts/screenshot-live.png', fullPage: true });
    console.log('Saved screenshot to scripts/screenshot-live.png');

    // Test interacting with Mute button
    if (muteBtn) {
      await muteBtn.click();
      console.log('Clicked mute/unmute button successfully');
    }

    // Wait 5 seconds to observe playback/state
    await page.waitForTimeout(5000);

    // Check if chat is open or toggleable
    const chatInput = await page.$('input[placeholder*="message"], input[placeholder*="mensaje"], input[placeholder*="chat"]');
    console.log('Chat input present:', Boolean(chatInput));

    await page.screenshot({ path: 'scripts/screenshot-after-5s.png', fullPage: true });
    console.log('Saved 5s screenshot to scripts/screenshot-after-5s.png');

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

testUI();
