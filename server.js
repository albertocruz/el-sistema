const express = require('express');
const compression = require('compression');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL;
const STATE_KEY = process.env.STATE_KEY || 'elsistema:v10:estado';

// ---------- Redis ----------
let redis = null;
let redisReady = false;
let memoryState = { items: {}, tiktok: {} };

async function initRedis() {
  if (!REDIS_URL) { console.warn('[warn] REDIS_URL not set'); return; }
  redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => { console.error('[redis]', err.message); redisReady = false; });
  redis.on('ready', () => { redisReady = true; console.log('[redis] ready'); });
  redis.on('end', () => { redisReady = false; });
  try { await redis.connect(); } catch(e) { console.error('[redis] connect failed:', e.message); }
}

async function readState() {
  if (redisReady) {
    try {
      const raw = await redis.get(STATE_KEY);
      if (!raw) return { items: {}, tiktok: {} };
      const p = JSON.parse(raw);
      return { items: p.items || {}, tiktok: p.tiktok || {} };
    } catch(e) { console.error('[redis] read error:', e.message); }
  }
  return memoryState;
}

async function writeState(state) {
  const safe = {
    items: (state && typeof state.items === 'object') ? state.items : {},
    tiktok: (state && typeof state.tiktok === 'object') ? state.tiktok : {}
  };
  memoryState = safe;
  if (redisReady) {
    try { await redis.set(STATE_KEY, JSON.stringify(safe)); return true; }
    catch(e) { console.error('[redis] write error:', e.message); return false; }
  }
  return false;
}

// ---------- App ----------
const app = express();
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.disable('x-powered-by');
app.use(express.static(__dirname));

// ---------- Data API (v10) ----------
const DATA_DIR = path.join(__dirname, 'data');

app.get('/api/data/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No encontrado: ' + name });
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(filePath);
});

app.get('/api/data', (req, res) => {
  if (!fs.existsSync(DATA_DIR)) return res.json([]);
  res.json(fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json','')));
});

// ---------- Estado API (v9 compatible) ----------
app.get('/health', (_req, res) => res.json({ ok: true, redis: redisReady, uptime: process.uptime() }));

app.get('/api/estado', async (_req, res) => {
  try { res.set('Cache-Control','no-store'); res.json(await readState()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/estado', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'invalid_body' });
    const persisted = await writeState(req.body);
    res.json({ ok: true, persisted, redis: redisReady });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ---------- Routes ----------
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'el_sistema_v10.html')));
app.get('/editor', (_req, res) => res.sendFile(path.join(__dirname, 'editor.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  res.redirect('/');
});

// ---------- Boot ----------
(async () => {
  await initRedis();
  app.listen(PORT, () => console.log(`[server] v10 en :${PORT}`));
})();

function shutdown(sig) {
  console.log('[server]', sig);
  if (redis && redisReady) { redis.quit().catch(()=>{}).finally(()=>process.exit(0)); setTimeout(()=>process.exit(0),2000); }
  else process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));