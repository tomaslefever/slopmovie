import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const models = [
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/ising-calibration-1.5-31b",
  "meta/llama-3.2-11b-vision-instruct",
  "deepseek-ai/deepseek-v4-flash-0731",
  "deepseek-ai/deepseek-v4-pro-0813"
];

// Let's test what happens with a real big prompt like generateStoryPremise
async function test() {
  const prompt = {
    messages: [
      {
        role: "system",
        content: `You are an elite Hollywood Showrunner and Cinematic Director creating a high-budget 50-step episodic movie series.
CRITICAL FORMAT RULES:
- Output valid JSON only matching the schema.
- Language: English only.
Schema:
{
  "title": string,
  "tagline": string,
  "initialPlot": string,
  "masterArcThread": string,
  "firstStepTitle": string,
  "firstStepSynopsis": string,
  "firstStepDialogue": string,
  "characters": [{"id": string, "name": string, "role": string, "visualTraits": string, "clothing": string, "personality": string, "voiceStyle": string, "voicePrompt": string}],
  "props": [{"id": string, "name": string, "description": string, "visualAppearance": string, "narrativeSignificance": string}],
  "environments": [{"id": string, "name": string, "lighting": string, "atmosphere": string, "colorPalette": string, "architecturalStyle": string}],
  "options": [{"id": "A", "title": string, "text": string, "dramaticHook": string, "expectedConsequence": string}, {"id": "B", "title": string, "text": string, "dramaticHook": string, "expectedConsequence": string}]
}`
      },
      {
        role: "user",
        content: "Generate a new blockbuster cinema premise for genre 'Cyberpunk Neo-Noir'."
      }
    ]
  };

  for (const model of models) {
    console.log(`\nTesting model: ${model}`);
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
          messages: prompt.messages,
          temperature: 0.8,
          max_tokens: 2500,
          chat_template_kwargs: { thinking: false },
          response_format: { type: 'json_object' }
        })
      });

      const elapsed = Date.now() - start;
      console.log(`HTTP ${resp.status} in ${elapsed}ms`);
      const body = await resp.text();
      console.log(`Body (first 300 chars): ${body.slice(0, 300)}`);
    } catch (e) {
      console.log(`Fetch error: ${e.message}`);
    }
  }
}

test();
