
const key = process.env.DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY;
const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
const model = 'nvidia/ising-calibration-1.5-31b';

function cleanAndParse(raw) {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      let str = '';
      let inString = false;
      let escaped = false;
      let openBraces = 0;
      let openBrackets = 0;

      for (let i = 0; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (c === '\\' && inString) {
          escaped = !escaped;
          str += c;
          continue;
        }
        if (c === '"' && !escaped) {
          inString = !inString;
          str += c;
        } else if (inString) {
          if (c === '\n') {
            str += '\\n';
          } else if (c === '\r') {
            // skip
          } else if (c === '\t') {
            str += '\\t';
          } else {
            str += c;
          }
        } else {
          if (c === '{') openBraces++;
          else if (c === '}') openBraces--;
          else if (c === '[') openBrackets++;
          else if (c === ']') openBrackets--;
          str += c;
        }
        escaped = false;
      }

      if (inString) str += '"';
      str = str.replace(/,\s*$/, '');
      while (openBrackets > 0) {
        str += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        str += '}';
        openBraces--;
      }

      try {
        return JSON.parse(str);
      } catch (e2) {
        console.error("Inner repair parse failed:", e2.message);
        console.log("End of string was:", str.slice(-200));
        throw err;
      }
    } catch (outer) {
      throw err;
    }
  }
}

const bibleTool = {
  type: 'function',
  function: {
    name: 'create_movie_concept',
    description: 'Provide the high-concept creative parameters for an interactive film in English.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        genre: { type: 'string' },
        tagline: { type: 'string' },
        initialPlot: { type: 'string' },
        cinematicStyle: { type: 'string', description: 'Camera package, lenses, lighting Kelvin, and film stock' },
        protagonistName: { type: 'string' },
        protagonistRole: { type: 'string' },
        protagonistVisual: { type: 'string' },
        protagonistVoice: { type: 'string' },
        keyPropName: { type: 'string' },
        keyPropAppearance: { type: 'string' },
        environmentName: { type: 'string' },
        environmentLighting: { type: 'string' },
        firstConflictHook: { type: 'string' },
        optionATitle: { type: 'string' },
        optionAText: { type: 'string' },
        optionBTitle: { type: 'string' },
        optionBText: { type: 'string' }
      },
      required: [
        'title', 'genre', 'tagline', 'initialPlot', 'cinematicStyle',
        'protagonistName', 'protagonistRole', 'protagonistVisual', 'protagonistVoice',
        'keyPropName', 'keyPropAppearance', 'environmentName', 'environmentLighting',
        'firstConflictHook', 'optionATitle', 'optionAText', 'optionBTitle', 'optionBText'
      ]
    }
  }
};

async function run() {
  console.log('Sending flat parameter tool call create_movie_concept...');
  const t0 = Date.now();
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are an elite Hollywood Director and Screenwriter. Provide the creative film concept in English by calling create_movie_concept.' },
        { role: 'user', content: 'Create the concept for an Arctic research sub thriller titled "Abyssal Frost".' }
      ],
      tools: [bibleTool],
      tool_choice: { type: 'function', function: { name: 'create_movie_concept' } },
      temperature: 0.8,
      max_tokens: 800
    })
  });

  const data = await resp.json();
  const dur = (Date.now() - t0) / 1000;
  console.log('Finished in', dur, 's. Status:', resp.status);
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall) {
    console.log('Tool name:', toolCall.function.name);
    const parsed = cleanAndParse(toolCall.function.arguments);
    console.log('Parsed successfully in', dur, 's!');
    console.log('Title:', parsed.title);
    console.log('Protagonist:', parsed.protagonistName, '(', parsed.protagonistRole, ')');
    console.log('Prop:', parsed.keyPropName);
    console.log('Conflict:', parsed.firstConflictHook);
    console.log('Option A:', parsed.optionATitle, '->', parsed.optionAText);
    console.log('Option B:', parsed.optionBTitle, '->', parsed.optionBText);
  } else {
    console.log('Raw message:', data.choices?.[0]?.message);
  }
}

run().catch(console.error);

