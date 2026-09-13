const key = process.env.OPENROUTER_API_KEY;
const endpoint = "https://openrouter.ai/api/v1/chat/completions";

const freeCandidateModels = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nex-agi/nex-n2.5-mini:free",
  "nex-agi/nex-n2.5-pro:free",
  "openrouter/free"
];

const testTool = {
  type: "function",
  function: {
    name: "create_cinema_step",
    description: "Formulates the next scene and 2 decision options in English.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        synopsis: { type: "string" },
        dialogueSnippet: { type: "string" },
        visualPrompt: { type: "string" },
        cameraMotionPrompt: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", enum: ["A", "B"] },
              title: { type: "string" },
              text: { type: "string" }
            },
            required: ["id", "title", "text"]
          }
        }
      },
      required: ["title", "synopsis", "visualPrompt", "options"]
    }
  }
};

async function testModel(model) {
  const t0 = Date.now();
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer": "https://slopmovie.com",
        "X-Title": "SlopMovie Cinema Engine"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are an elite Interactive Cinema Director. Output the next scene by calling create_cinema_step." },
          { role: "user", content: "The detective enters the neon-lit alleyway and hears footsteps behind him. Formulate the next scene with 2 distinct options in English." }
        ],
        tools: [testTool],
        tool_choice: { type: "function", function: { name: "create_cinema_step" } },
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    const dur = (Date.now() - t0) / 1000;
    const status = resp.status;
    const data = await resp.json();

    if (status !== 200) {
      console.log(`❌ [${model}] status=${status} (${dur}s):`, data.error?.message || JSON.stringify(data));
      return { model, success: false, status, dur, error: data.error?.message };
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const content = data.choices?.[0]?.message?.content;
    const args = toolCall?.function?.arguments || content;

    let parsed = null;
    try {
      parsed = JSON.parse(args);
    } catch {
      // json parse failed
    }

    if (parsed && (parsed.title || parsed.options)) {
      console.log(`✅ [${model}] in ${dur}s: Title="${parsed.title}" (Options: "${parsed.options?.[0]?.title}" vs "${parsed.options?.[1]?.title}")`);
      return { model, success: true, dur, tokens: data.usage?.total_tokens, parsed };
    } else {
      console.log(`⚠️ [${model}] status=200 in ${dur}s (content/args preview):`, String(args || '').slice(0, 150));
      return { model, success: false, dur, raw: args };
    }
  } catch (err) {
    const dur = (Date.now() - t0) / 1000;
    console.log(`❌ [${model}] failed in ${dur}s:`, err.message);
    return { model, success: false, dur, error: err.message };
  }
}

async function runAll() {
  console.log("=== Testing Free OpenRouter Models for SlopMovie ===\n");
  const results = [];
  for (const model of freeCandidateModels) {
    const res = await testModel(model);
    results.push(res);
  }

  console.log("\n=== Summary (Sorted by Speed) ===");
  const successful = results.filter(r => r.success).sort((a, b) => a.dur - b.dur);
  successful.forEach((r, i) => {
    console.log(`${i + 1}. ${r.model} -> ${r.dur}s`);
  });
}

runAll();
