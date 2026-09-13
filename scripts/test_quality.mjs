import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const topModels = [
  'nvidia/nemotron-3-super-120b-a12b',
  'meta/llama-3.2-11b-vision-instruct',
  'nvidia/ising-calibration-1.5-31b',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  'deepseek-ai/deepseek-v4-flash-0731',
  'deepseek-ai/deepseek-v4-pro-0813'
];

const realisticPrompt = {
  messages: [
    {
      role: 'system',
      content: 'You are an award-winning Hollywood cinematic director. Generate a creative movie step with options in valid JSON format. All text in English.'
    },
    {
      role: 'user',
      content: `Given this movie context:
Movie: "Project Nemesis: Protocol 2099"
Genre: Cyberpunk Thriller
Current Step: 2
Previous Action: Decrypted the Quantum Prism

Generate Step 3 with:
- title: string
- synopsis: string (max 200 chars)
- dialogue: string
- subtitles: array of { start: number, end: number, speaker: string, text: string, textEs: string }
- options: 2 options (id "A" and "B"), each with title, text, dramaticHook, expectedConsequence.

Output ONLY valid JSON.`
    }
  ]
};

async function testPromptQuality(model) {
  const start = Date.now();
  try {
    const resp = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      signal: AbortSignal.timeout(20000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: realisticPrompt.messages,
        temperature: 0.7,
        max_tokens: 1000,
        chat_template_kwargs: { thinking: false },
        response_format: { type: 'json_object' }
      })
    });

    const elapsed = Date.now() - start;
    if (!resp.ok) {
      const err = await resp.text();
      return { model, status: resp.status, elapsed, error: err.slice(0, 100) };
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

    return {
      model,
      status: 200,
      elapsed,
      parsed,
      rawPreview: content?.slice(0, 200)
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return { model, status: 'TIMEOUT', elapsed, error: err.message };
  }
}

async function main() {
  console.log('Testing realistic cinema step generation across top candidate models...\n');
  for (const m of topModels) {
    console.log(`--- Testing: ${m} ---`);
    const res = await testPromptQuality(m);
    console.log(`Status: ${res.status} | Latency: ${res.elapsed}ms`);
    if (res.parsed) {
      console.log(`Title: ${res.parsed.title}`);
      console.log(`Synopsis: ${res.parsed.synopsis}`);
      console.log(`Options: ${res.parsed.options?.length || 0} options`);
      console.log(`Subtitles: ${res.parsed.subtitles?.length || 0} cues`);
    } else {
      console.log(`Raw/Error: ${res.error || res.rawPreview || 'N/A'}`);
    }
    console.log('\n');
  }
}

main();
