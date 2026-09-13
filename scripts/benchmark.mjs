import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const modelsToTest = [
  'deepseek-ai/deepseek-v4-pro-0813',
  'deepseek-ai/deepseek-v4-flash-0731',
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.1-nemotron-51b-instruct',
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'mistralai/mistral-large-2-instruct',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
  'google/gemma-3-27b-it',
  'google/gemma-3-12b-it',
  'google/gemma-3-4b-it',
  'google/gemma-2-27b-it',
  'google/gemma-2-9b-it',
  'z-ai/glm-5.3-flash',
  'qwen/qwen2.5-72b-instruct',
  'qwen/qwen2.5-7b-instruct'
];

async function run() {
  console.log('Testing models on NVIDIA NIM with key:', apiKey.substring(0, 12) + '...');
  const results = [];

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

  for (const model of modelsToTest) {
    const start = Date.now();
    try {
      const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        signal: AbortSignal.timeout(15000),
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
        results.push({ model, status: resp.status, elapsed, error: errTxt.slice(0, 120) });
        console.log(`❌ [${model}] HTTP ${resp.status} in ${elapsed}ms: ${errTxt.slice(0, 80)}`);
        continue;
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
      results.push({
        model,
        status: 200,
        elapsed,
        validJson,
        usage: data.usage,
        title: parsed?.title,
        sampleOutput: parsed
      });
      console.log(`✅ [${model}] 200 OK in ${elapsed}ms | Valid JSON: ${validJson} | Title: "${parsed?.title}"`);
    } catch (err) {
      const elapsed = Date.now() - start;
      results.push({ model, status: 'TIMEOUT/ERROR', elapsed, error: err.message });
      console.log(`⏱️ [${model}] ERROR/TIMEOUT in ${elapsed}ms: ${err.message}`);
    }
  }

  console.log('\n=========================================');
  console.log('🏆 SUMMARY RANKING (Fastest -> Slowest)');
  console.log('=========================================');
  const successful = results
    .filter(r => r.status === 200 && r.validJson)
    .sort((a, b) => a.elapsed - b.elapsed);

  successful.forEach((r, i) => {
    console.log(`#${i + 1} | ${r.elapsed}ms | ${r.model} (Tokens: ${r.usage?.total_tokens || '?'})`);
  });

  console.log('\n❌ Failed / Incompatible Models:');
  results
    .filter(r => r.status !== 200 || !r.validJson)
    .forEach(r => {
      console.log(`- ${r.model}: Status=${r.status} (${r.elapsed}ms) Error=${r.error || 'Invalid JSON format'}`);
    });
}

run();
