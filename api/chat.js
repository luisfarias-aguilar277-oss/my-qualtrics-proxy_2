module.exports = async (req, res) => {
  // CORS
  const ALLOW_ORIGIN = '*'; // or "https://YOUR-ORG.qualtrics.com"
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS,GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);
    return res.status(200).json({ ok: true, route: '/api/chat' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGIN);

  // ---- parse JSON body safely (plain Node functions don't auto-parse) ----
  const raw = await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } 
  catch { return res.status(400).json({ error: 'Invalid JSON body' }); }

  const { prompt, system, history, model, temperature, max_tokens } = body;

  // Build messages for OpenAI Chat Completions
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (Array.isArray(history)) {
    for (const m of history) if (m?.role && m?.content) messages.push(m);
  }
  if (prompt) messages.push({ role: 'user', content: prompt });

  try {
    const oai = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!oai.ok) {
      const detail = await oai.text();
      return res.status(500).json({ error: 'OpenAI error', detail });
    }
    const data = await oai.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy error', detail: String(err) });
  }
};
