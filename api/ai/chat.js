import { readJson, sendJson, sendError } from '../_lib/http.js';
import { requireUserId } from '../_lib/auth.js';

async function callOpenAI({ prompt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a supportive journaling companion. Keep responses brief and practical.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.error?.message || 'OpenAI request failed');
    err.status = 502;
    err.data = json;
    throw err;
  }

  const text = json?.choices?.[0]?.message?.content?.trim() || '';
  return text;
}

export default async function handler(req, res) {
  try {
    // Require auth so user data is scoped.
    await requireUserId(req);

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { message: 'Method not allowed' });
    }

    const body = (await readJson(req)) || {};
    const prompt = String(body.prompt || '').trim();
    if (!prompt) {
      const err = new Error('Prompt is required');
      err.status = 400;
      throw err;
    }

    const aiText = await callOpenAI({ prompt });

    if (aiText) {
      return sendJson(res, 200, { data: aiText });
    }

    // Fallback if no OPENAI_API_KEY is configured.
    const fallback =
      'I hear you. Try capturing one small detail you can control today, and one gentle action you can take next. '
      + 'If you want, summarize the moment in one sentence and ask: "What do I want to remember from this?"';

    return sendJson(res, 200, { data: fallback });
  } catch (err) {
    return sendError(res, err);
  }
}
