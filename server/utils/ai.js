const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

function parseAIContent(content) {
  if (!content) {
    throw new Error('AI returned empty content');
  }
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const fixed = cleaned.replace(/(?<=:"[^"]*)\n/g, '\\n').replace(/(?<=:"[^"]*)\t/g, '\\t');
    try {
      return JSON.parse(fixed);
    } catch {
      const formatMatch = cleaned.match(/"format"\s*:\s*(\{[^}]+\})/);
      const cssMatch = cleaned.match(/"css"\s*:\s*"([\s\S]*)"$/);
      if (formatMatch) {
        const format = JSON.parse(formatMatch[1]);
        const css = cssMatch ? cssMatch[1].replace(/\\"/g, '"').replace(/\n/g, ' ') : '';
        return { format, css };
      }
      throw new Error('Failed to parse AI response as JSON');
    }
  }
}

async function nvidiaFetch(payload) {
  const response = await fetch(NVIDIA_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  console.log(`  <- Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const err = await response.text();
    console.error('NVIDIA API error body:', err || '(empty)');
    throw new Error(`AI service error (${response.status}): ${err || response.statusText}`);
  }

  return response.json();
}

export async function callAI(systemPrompt, userContent, { maxTokens = 16384, temperature = 0.1 } = {}) {
  console.log(`  -> Sending ${userContent.length} chars to AI...`);

  const data = await nvidiaFetch({
    model: 'meta/llama-3.1-70b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: 1.0,
    stream: false,
  });

  const content = data.choices?.[0]?.message?.content;
  console.log(`  <- finish_reason: ${data.choices?.[0]?.finish_reason}, content length: ${content?.length || 0}`);

  return parseAIContent(content);
}

/**
 * Agentic tool-use loop: sends messages + tools to Llama, executes tool_calls,
 * feeds results back, repeats until Llama returns final content (no more tool calls).
 *
 * @param {Array} messages - OpenAI-format message array
 * @param {Array} tools - OpenAI-format tool definitions
 * @param {Function} toolExecutor - async (toolName, args) => string result
 * @param {Object} opts
 * @returns {Object} Parsed JSON from Llama's final response
 */
export async function callAIWithTools(messages, tools, toolExecutor, { maxTokens = 16384, temperature = 0.1, maxRounds = 5, toolChoice = 'auto', shouldStop = null } = {}) {
  const currentMessages = [...messages];

  for (let round = 0; round < maxRounds; round++) {
    // Force specific tool on first round if toolChoice is set, then switch to auto
    const currentToolChoice = (round === 0 && toolChoice !== 'auto') ? toolChoice : 'auto';
    console.log(`  [Agentic] Round ${round + 1}/${maxRounds}, ${currentMessages.length} messages, tool_choice: ${JSON.stringify(currentToolChoice)}`);

    const data = await nvidiaFetch({
      model: 'meta/llama-3.1-70b-instruct',
      messages: currentMessages,
      tools,
      tool_choice: currentToolChoice,
      max_tokens: maxTokens,
      temperature,
      top_p: 1.0,
      stream: false,
    });

    const choice = data.choices?.[0];
    const msg = choice?.message;
    const finishReason = choice?.finish_reason;

    console.log(`  [Agentic] finish_reason: ${finishReason}, tool_calls: ${msg?.tool_calls?.length || 0}`);

    // No tool calls = model is done, return parsed content
    if (!msg?.tool_calls?.length) {
      return parseAIContent(msg?.content);
    }

    // Add assistant message (with tool_calls) to conversation
    currentMessages.push(msg);

    // Execute each tool call and append results
    for (const tc of msg.tool_calls) {
      const fnName = tc.function.name;
      let args;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      console.log(`  [Tool Call] ${fnName}(${Object.keys(args).join(', ')})`);

      let result;
      try {
        result = await toolExecutor(fnName, args);
      } catch (err) {
        result = `Error: ${err.message}`;
        console.error(`  [Tool Error] ${fnName}: ${err.message}`);
      }

      const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
      console.log(`  [Tool Result] ${fnName}: ${resultStr.slice(0, 300)}${resultStr.length > 300 ? '...' : ''}`);

      currentMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: resultStr,
      });

      // Allow caller to short-circuit the loop (e.g., score >= 90%)
      if (shouldStop && shouldStop(fnName, resultStr)) {
        console.log(`  [Agentic] shouldStop returned true after ${fnName}, ending loop early`);
        return null;
      }
    }
  }

  throw new Error('AI tool-use loop exceeded max rounds without producing a final answer');
}
