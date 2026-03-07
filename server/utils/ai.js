const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

export async function callAI(systemPrompt, userContent, { maxTokens = 16384, temperature = 0.1 } = {}) {
  const payload = {
    model: 'meta/llama-3.1-70b-instruct',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: maxTokens,
    temperature,
    top_p: 1.0,
    stream: false,
  };

  console.log(`  -> Sending ${userContent.length} chars to AI...`);

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
    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
    throw new Error(`AI service error (${response.status}): ${err || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  console.log(`  <- finish_reason: ${data.choices?.[0]?.finish_reason}, content length: ${content?.length || 0}`);

  if (!content) {
    console.error('AI response had no content. Full message:', JSON.stringify(data.choices?.[0]?.message, null, 2));
    throw new Error('AI returned empty content — model may need more max_tokens');
  }

  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix common JSON issues: unescaped newlines/tabs inside string values
    const fixed = cleaned.replace(/(?<=:"[^"]*)\n/g, '\\n').replace(/(?<=:"[^"]*)\t/g, '\\t');
    try {
      return JSON.parse(fixed);
    } catch {
      // Last resort: extract format and css separately
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
