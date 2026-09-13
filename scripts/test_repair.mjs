function repairJson(raw) {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  
  // 1. Try standard parse
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // 2. Attempt smart repair for truncated strings / unclosed brackets
    try {
      let str = cleaned;
      // If ends with unclosed string (odd number of unescaped quotes after last colon/comma)
      let inString = false;
      let escaped = false;
      let openBraces = 0;
      let openBrackets = 0;
      
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === '\\' && inString) {
          escaped = !escaped;
          continue;
        }
        if (c === '"' && !escaped) {
          inString = !inString;
        } else if (!inString) {
          if (c === '{') openBraces++;
          else if (c === '}') openBraces--;
          else if (c === '[') openBrackets++;
          else if (c === ']') openBrackets--;
        }
        escaped = false;
      }

      if (inString) {
        str += '"';
      }
      while (openBrackets > 0) {
        str += ']';
        openBrackets--;
      }
      while (openBraces > 0) {
        str += '}';
        openBraces--;
      }

      return JSON.parse(str);
    } catch (repairErr) {
      console.warn('Repair failed:', repairErr.message);
      return null;
    }
  }
}

// Test with truncated JSON
const testTruncated = '{"title": "The Quantum Shift", "synopsis": "A detective discovers a hidden network beneath the city';
const fixed = repairJson(testTruncated);
console.log('Fixed object:', fixed);
