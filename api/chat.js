export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');       // or your Qualtrics domain
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');       // or your Qualtrics domain

    const { prompt, system, history, model, temperature, max_tokens } = req.body || {};

    // Build messages array for Chat Completions
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    if (Array.isArray(history)) {
      for (const m of history) {
        if (m && m.role && m.content) messages.push({ role: m.role, content: m.content });
      }
    }
    if (prompt) messages.push({ role: 'user', content: prompt });

    // Call OpenAI (Chat Completions-style)
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: typeof temperature === 'number' ? temperature : undefined,
        max_tokens: Number.isInteger(max_tokens) ? max_tokens : undefined
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ error: 'OpenAI error', detail: text });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text: content });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
}
