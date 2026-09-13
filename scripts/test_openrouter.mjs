const key = process.env.OPENROUTER_API_KEY;

if (!key) {
  console.error("No OPENROUTER_API_KEY found!");
  process.exit(1);
}

const endpoint = "https://openrouter.ai/api/v1/chat/completions";

const candidateModels = [
  "deepseek/deepseek-chat",
  "google/gemini-2.0-flash-001",
  "google/gemini-2.0-flash-lite-001",
  "meta-llama/llama-3.3-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
  "mistralai/mistral-small-24b-instruct-2501",
  "deepseek/deepseek-chat:free",
  "meta-llama/llama-3.3-70b-instruct:free"
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
          { role: "system", content: "You are an elite Interactive Cinema AI Director. Output the next scene by calling create_cinema_step." },
          { role: "user", content: "The detective enters the neon-lit alleyway and hears footsteps behind him. Formulate the next scene with 2 distinct options." }
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
      // try simple match
    }

    if (parsed && parsed.title && parsed.options) {
      console.log(`✅ [${model}] in ${dur}s: Title="${parsed.title}" (Options: "${parsed.options[0]?.title}" vs "${parsed.options[1]?.title}") [Tokens: ${data.usage?.total_tokens ?? '?'}]`);
      return { model, success: true, dur, tokens: data.usage?.total_tokens, parsed };
    } else {
      console.log(`⚠️ [${model}] status=200 in ${dur}s but tool parsing issue:`, args?.slice(0, 150));
      return { model, success: false, dur, raw: args };
    }
  } catch (err) {
    const dur = (Date.now() - t0) / 1000;
    console.log(`❌ [${model}] failed in ${dur}s:`, err.message);
    return { model, success: false, dur, error: err.message };
  }
}

async function runAll() {
  console.log("=== Testing OpenRouter Models for SlopMovie ===\n");
  const results = [];
  for (const model of candidateModels) {
    const res = await testModel(model);
    results.push(res);
  }

  console.log("\n=== Summary (Sorted by Speed) ===");
  const successful = results.filter(r => r.success).sort((a, b) => a.dur - b.dur);
  successful.forEach((r, i) => {
    console.log(`${i + 1}. ${r.model} -> ${r.dur}s (${r.tokens} tokens)`);
  });
}

runAll();
