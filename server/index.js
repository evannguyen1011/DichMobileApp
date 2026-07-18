require('dotenv').config();
const os = require('os');
const express = require('express');
const rateLimit = require('express-rate-limit');
const qrcode = require('qrcode-terminal');

function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

const app = express();
app.use(express.json({ limit: '100kb' }));

// Basic abuse protection - this endpoint is reachable by anyone on the LAN (or the internet,
// if you later deploy it), and it spends *your* Gemini quota, not the caller's.
const limiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/gemini', limiter);

const MODEL = 'gemini-2.0-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

app.post('/api/gemini', async (req, res) => {
  const prompt = req.body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing "prompt" in request body' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server chua cau hinh GEMINI_API_KEY (xem server/.env)' });
  }

  try {
    const response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return res.status(502).json({ error: `Gemini loi ${response.status}: ${body.slice(0, 200)}` });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(502).json({ error: 'Gemini khong tra ve noi dung.' });

    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  const url = `http://${getLanIp()}:${PORT}`;
  console.log(`[gemini-proxy] listening on ${url}`);
  console.log('[gemini-proxy] scan this in the app\'s Gemini settings (same WiFi required):');
  qrcode.generate(url, { small: true });
});
