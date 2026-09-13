import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const model = 'nvidia/ising-calibration-1.5-31b';

async function testAll() {
  console.log('Testing End-to-End LLM Generation Flows with:', model);

  // 1. Next step options & scene
  console.log('\n--- 1. Testing Next Step Generation ---');
  const startStep = Date.now();
  const resp1 = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a cinematic Hollywood director. Output valid JSON. English only.' },
        { role: 'user', content: 'Generate next step for Cyberpunk movie. Output JSON schema: {"title": "str", "synopsis": "str", "dialogueSnippet": "str", "options": [{"id": "A", "title": "str", "text": "str", "dramaticHook": "str", "expectedConsequence": "str"}, {"id": "B", "title": "str", "text": "str", "dramaticHook": "str", "expectedConsequence": "str"}]}' }
      ],
      temperature: 0.8,
      max_tokens: 650,
      response_format: { type: 'json_object' }
    })
  });
  const t1 = Date.now() - startStep;
  const data1 = await resp1.json();
  console.log(`Step Result in ${t1}ms: status=${resp1.status}, tokens=${data1.usage?.total_tokens}`);
  console.log(data1.choices?.[0]?.message?.content?.slice(0, 150));

  // 2. Blockbuster Candidates
  console.log('\n--- 2. Testing 4 Blockbuster Candidates ---');
  const startCand = Date.now();
  const resp2 = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an avant-garde Head of Development. Output valid JSON only. English only.' },
        { role: 'user', content: 'Generate 4 blockbuster pitches. Schema: {"candidates": [{"title": "str", "logline": "str", "genre": "str", "premise": "str"}]}' }
      ],
      temperature: 0.9,
      max_tokens: 850,
      response_format: { type: 'json_object' }
    })
  });
  const t2 = Date.now() - startCand;
  const data2 = await resp2.json();
  console.log(`Candidates Result in ${t2}ms: status=${resp2.status}, tokens=${data2.usage?.total_tokens}`);
  console.log(data2.choices?.[0]?.message?.content?.slice(0, 150));
}

testAll();
