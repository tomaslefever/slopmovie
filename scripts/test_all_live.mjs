import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const allModels = JSON.parse(fs.readFileSync('scripts/live_models.json', 'utf8')).map(m => m.id);

async function testModel(model) {
  const prompt = {
    messages: [
      {
        role: 'system',
        content: 'You are an award-winning Hollywood cinematic director. Output strictly valid JSON matching the requested schema. Everything must be in English.'
      },
      {
        role: 'user',
        content: 'Generate a short 1-scene sci-fi premise with 2 decision options (A and B). Schema: {"title": "string", "synopsis": "string", "options": [{"id": "A", "title": "string", "text": "string"}, {"id": "B", "title": "string", "text": "string"}]}'
      }
    ]
  };

  const start = Date.now();
  try {
    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      signal: AbortSignal.timeout(12000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: prompt.messages,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      })
    });

    const elapsed = Date.now() - start;
    if (!resp.ok) {
      const errTxt = await resp.text();
      return { model, status: resp.status, elapsed, error: errTxt.slice(0, 80) };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content;
    let parsed = null;
    try {
      let cleaned = (content || '').trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      parsed = JSON.parse(cleaned);
    } catch (e) {
      parsed = null;
    }

    const validJson = typeof parsed === 'object' && parsed !== null && Boolean(parsed.title || parsed.options);
    return {
      model,
      status: 200,
      elapsed,
      validJson,
      tokens: data.usage?.total_tokens,
      sampleTitle: parsed?.title || (content ? content.slice(0, 40) : ''),
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { model, status: 'TIMEOUT', elapsed, error: err.message };
  }
}

async function main() {
  console.log(`Scanning all ${allModels.length} models from NVIDIA NIM catalog...`);
  const results = [];

  for (const model of allModels) {
    const res = await testModel(model);
    results.push(res);
    if (res.status === 200 && res.validJson) {
      console.log(`✅ [${res.elapsed}ms] ${model} -> "${res.sampleTitle}"`);
    } else if (res.status === 200) {
      console.log(`⚠️ [${res.elapsed}ms] ${model} (Non-JSON 200 OK)`);
    } else if (res.status === 'TIMEOUT') {
      console.log(`⏱️ [TIMEOUT] ${model}`);
    } else {
      // 404 or 410 or other
      // console.log(`❌ [${res.status}] ${model}`);
    }
  }

  console.log('\n======================================================');
  console.log('🏆 COMPLETE LEADERBOARD OF RESPONDING MODELS (Sorted by Speed)');
  console.log('======================================================');
  const working = results
    .filter(r => r.status === 200)
    .sort((a, b) => a.elapsed - b.elapsed);

  working.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.elapsed}ms] ${r.model} (Valid JSON: ${r.validJson}) - "${r.sampleTitle}"`);
  });
}

main();
