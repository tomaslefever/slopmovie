// Remote deployment webhook trigger
const DEPLOY_TRIGGER_URL = 'http://69.62.101.90:3000/api/deploy/16debc098d2f3b0ee860cca1369e165a6f3c9cf99b9c90b1';

async function triggerDeploy() {
  console.log(`[Deploy] Triggering remote deployment via ${DEPLOY_TRIGGER_URL}...`);
  try {
    const response = await fetch(DEPLOY_TRIGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'post-push', timestamp: new Date().toISOString() })
    }).catch(async () => {
      return await fetch(DEPLOY_TRIGGER_URL, { method: 'GET' });
    });

    const body = await response.text();
    console.log(`[Deploy] Response status: ${response.status}`);
    console.log(`[Deploy] Response body:`, body);
    if (response.ok) {
      console.log(`[Deploy] ✅ Remote deployment triggered successfully!`);
    } else {
      console.warn(`[Deploy] ⚠️ Webhook returned status ${response.status}`);
    }
  } catch (error) {
    console.error(`[Deploy] ❌ Failed to trigger deploy webhook:`, error.message);
  }
}

triggerDeploy();
