export default async function handler(req, res) {
  const ALLOW_ORIGIN = '*'; // or your Qualtrics domain
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

  const { prompt, system, history, model, temperature, max_tokens } = req.body || {};
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (Array.isArray(history)) history.forEach(m => m?.role && m?.content && messages.push(m));
  if (prompt) messages.push({ role: 'user', content: prompt });

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature, max_tokens })
  });
  if (!resp.ok) return res.status(500).json({ error: 'OpenAI error', detail: await resp.text() });

  const data = await resp.json();
  return res.status(200).json({ text: data?.choices?.[0]?.message?.content ?? '' });
}
