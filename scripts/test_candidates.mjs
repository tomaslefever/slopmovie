import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const candidateModels = [
  'writer/palmyra-creative-122b',
  'openai/gpt-oss-20b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'nvidia/mistral-nemo-minitron-8b-8k-instruct',
  'nvidia/nemotron-nano-3-30b-a3b',
  'nvidia/nemotron-4-340b-instruct',
  'mistralai/mistral-large',
  'mistralai/mixtral-8x22b-v0.1',
  'mistralai/mistral-nemotron',
  'ai21labs/jamba-1.5-large-instruct',
  '01-ai/yi-large',
  'google/gemma-4-31b-it',
  'meta/llama-3.2-11b-vision-instruct',
  'ibm/granite-3.0-8b-instruct',
  'microsoft/phi-3.5-moe-instruct',
  'moonshotai/kimi-k2.6',
  'deepseek-ai/deepseek-v4-flash-0731',
  'deepseek-ai/deepseek-v4-pro-0813',
  'z-ai/glm-5.3-flash'
];

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
      signal: AbortSignal.timeout(10000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: prompt.messages,
        temperature: 0.7,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    });

    const elapsed = Date.now() - start;
    if (!resp.ok) {
      const errTxt = await resp.text();
      return { model, status: resp.status, elapsed, error: errTxt.slice(0, 100) };
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

    const validJson = typeof parsed === 'object' && parsed !== null && Boolean(parsed.title) && Array.isArray(parsed.options) && parsed.options.length === 2;
    return {
      model,
      status: 200,
      elapsed,
      validJson,
      tokens: data.usage?.total_tokens,
      sampleTitle: parsed?.title,
      contentPreview: content?.slice(0, 120)
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { model, status: 'TIMEOUT', elapsed, error: err.message };
  }
}

async function main() {
  console.log(`Starting benchmark for ${candidateModels.length} candidates on NVIDIA NIM...`);
  const results = [];

  for (const model of candidateModels) {
    process.stdout.write(`Testing [${model}] ... `);
    const res = await testModel(model);
    results.push(res);
    if (res.status === 200 && res.validJson) {
      console.log(`✅ ${res.elapsed}ms | "${res.sampleTitle}" | ${res.tokens} tokens`);
    } else if (res.status === 200 && !res.validJson) {
      console.log(`⚠️ 200 OK (${res.elapsed}ms) but Invalid JSON`);
    } else {
      console.log(`❌ ${res.status} (${res.elapsed}ms) ${res.error || ''}`);
    }
  }

  console.log('\n=========================================');
  console.log('🏆 TOP WORKING MODELS RANKED BY SPEED');
  console.log('=========================================');
  const successful = results
    .filter(r => r.status === 200 && r.validJson)
    .sort((a, b) => a.elapsed - b.elapsed);

  successful.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.elapsed}ms] ${r.model} (Tokens: ${r.tokens}) -> Sample: "${r.sampleTitle}"`);
  });
}

main();
