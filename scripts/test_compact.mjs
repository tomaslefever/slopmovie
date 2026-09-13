import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const models = [
  "nvidia/ising-calibration-1.5-31b",
  "nvidia/nemotron-3-super-120b-a12b",
  "meta/llama-3.2-11b-vision-instruct",
  "google/gemma-3-12b-it",
  "google/gemma-3-4b-it",
  "google/gemma-4-31b-it",
  "mistralai/mistral-large"
];

const compactPrompt = {
  messages: [
    {
      role: 'system',
      content: 'Hollywood cinematic director. Output JSON only. English.'
    },
    {
      role: 'user',
      content: 'Generate next cinema step for "Cyberpunk 2099". JSON format: {"title": "str", "synopsis": "str", "options": [{"id": "A", "title": "str", "text": "str"}, {"id": "B", "title": "str", "text": "str"}]}'
    }
  ]
};

async function testCompact() {
  for (const model of models) {
    const start = Date.now();
    try {
      const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: compactPrompt.messages,
          temperature: 0.7,
          max_tokens: 350,
          response_format: { type: 'json_object' }
        })
      });
      const elapsed = Date.now() - start;
      const status = resp.status;
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content;
        console.log(`✅ [${model}] ${elapsed}ms | tokens=${data.usage?.total_tokens} | content: ${content?.slice(0, 100).replace(/\n/g, ' ')}`);
      } else {
        const err = await resp.text();
        console.log(`❌ [${model}] HTTP ${status} in ${elapsed}ms: ${err.slice(0, 60)}`);
      }
    } catch (e) {
      console.log(`⏱️ [${model}] Error: ${e.message}`);
    }
  }
}

testCompact();
