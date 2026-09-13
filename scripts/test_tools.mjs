import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/(?:DEEPSEEK_API_KEY|NVIDIA_API_KEY)=(.*)/);
const apiKey = keyMatch ? keyMatch[1].trim() : '';

const model = 'nvidia/ising-calibration-1.5-31b';

async function testToolCalling() {
  console.log('Testing Tool Calling on:', model);
  
  const toolSchema = {
    type: "function",
    function: {
      name: "create_cinema_step",
      description: "Generates the next scene and two branching decision options for the interactive movie.",
      parameters: {
        type: "object",
        properties: {
          stepNumber: { type: "integer" },
          title: { type: "string" },
          synopsis: { type: "string" },
          dialogueSnippet: { type: "string" },
          voiceDirection: { type: "string" },
          visualPrompt: { type: "string" },
          cameraMotionPrompt: { type: "string" },
          visualPrompt2: { type: "string" },
          cameraMotionPrompt2: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", enum: ["A", "B"] },
                title: { type: "string" },
                text: { type: "string" },
                dramaticHook: { type: "string" },
                expectedConsequence: { type: "string" }
              },
              required: ["id", "title", "text", "dramaticHook", "expectedConsequence"]
            }
          }
        },
        required: ["title", "synopsis", "visualPrompt", "options"]
      }
    }
  };

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
        messages: [
          { role: 'system', content: 'You are an award-winning cinematic director. Always call create_cinema_step.' },
          { role: 'user', content: 'Create next step for Cyberpunk movie. Step 5.' }
        ],
        tools: [toolSchema],
        tool_choice: { type: "function", function: { name: "create_cinema_step" } },
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const elapsed = Date.now() - start;
    console.log(`HTTP ${resp.status} in ${elapsed}ms`);
    const data = await resp.json();
    console.log('Response structure:', Object.keys(data));
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      console.log('✅ Tool Call Name:', toolCalls[0].function.name);
      console.log('Arguments preview:', toolCalls[0].function.arguments?.slice(0, 200));
      const parsed = JSON.parse(toolCalls[0].function.arguments);
      console.log('Parsed title:', parsed.title);
      console.log('Parsed options count:', parsed.options?.length);
    } else {
      console.log('Raw message content:', data.choices?.[0]?.message?.content?.slice(0, 200));
    }
  } catch (e) {
    console.log('Tool test error:', e.message);
  }
}

testToolCalling();
