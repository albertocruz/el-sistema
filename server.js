/* ============================================================
   El Sistema v9 · Server
   Express + Redis on Railway
   ============================================================ */

const express = require('express');
const compression = require('compression');
const { createClient } = require('redis');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL;
const STATE_KEY = process.env.STATE_KEY || 'elsistema:v9:estado';
const HTML_FILE = process.env.HTML_FILE || 'el_sistema_v9.html';

// ---------- Redis ----------
let redis = null;
let redisReady = false;

async function initRedis() {
  if (!REDIS_URL) {
    console.warn('[warn] REDIS_URL not set — running without persistence. State will be in-memory only.');
    return;
  }
  redis = createClient({ url: REDIS_URL });
  redis.on('error', (err) => {
    console.error('[redis] error:', err.message);
    redisReady = false;
  });
  redis.on('ready', () => {
    redisReady = true;
    console.log('[redis] connected & ready');
  });
  redis.on('end', () => {
    redisReady = false;
    console.warn('[redis] connection ended');
  });
  try {
    await redis.connect();
  } catch (e) {
    console.error('[redis] initial connect failed:', e.message);
  }
}

// Fallback in-memory state if Redis is unavailable
let memoryState = { items: {}, tiktok: {} };

async function readState() {
  if (redisReady) {
    try {
      const raw = await redis.get(STATE_KEY);
      if (!raw) return { items: {}, tiktok: {} };
      const parsed = JSON.parse(raw);
      return {
        items: parsed.items || {},
        tiktok: parsed.tiktok || {}
      };
    } catch (e) {
      console.error('[redis] read error:', e.message);
    }
  }
  return memoryState;
}

async function writeState(state) {
  const safe = {
    items: state && state.items && typeof state.items === 'object' ? state.items : {},
    tiktok: state && state.tiktok && typeof state.tiktok === 'object' ? state.tiktok : {}
  };
  memoryState = safe;
  if (redisReady) {
    try {
      await redis.set(STATE_KEY, JSON.stringify(safe));
      return true;
    } catch (e) {
      console.error('[redis] write error:', e.message);
      return false;
    }
  }
  return false; // Only memory
}

// ---------- App ----------
const app = express();
app.use(compression());                           // gzip — critical, HTML is ~1.3 MB
app.use(express.json({ limit: '5mb' }));          // state payload can grow
app.disable('x-powered-by');

// ---------- Healthcheck ----------
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    redis: redisReady,
    node: process.version,
    uptime: process.uptime()
  });
});

// ---------- State API ----------
app.get('/api/estado', async (_req, res) => {
  try {
    const state = await readState();
    res.set('Cache-Control', 'no-store');
    res.json(state);
  } catch (e) {
    console.error('[api/estado GET]', e);
    res.status(500).json({ error: 'read_failed', message: e.message });
  }
});

app.post('/api/estado', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'invalid_body' });
    }
    const persisted = await writeState(body);
    res.json({ ok: true, persisted, redis: redisReady });
  } catch (e) {
    console.error('[api/estado POST]', e);
    res.status(500).json({ error: 'write_failed', message: e.message });
  }
});

// Convenience: backup endpoint
app.get('/api/estado/backup', async (_req, res) => {
  const state = await readState();
  res.set('Content-Disposition', `attachment; filename="elsistema_estado_${new Date().toISOString().slice(0,10)}.json"`);
  res.json(state);
});

// ---------- Static HTML ----------
// Resolve HTML relative to server.js
const htmlPath = path.resolve(__dirname, HTML_FILE);
if (!fs.existsSync(htmlPath)) {
  console.error(`[fatal] HTML file not found at ${htmlPath}`);
  console.error(`        Expected ${HTML_FILE} next to server.js.`);
}

app.get('/', (_req, res) => {
  res.sendFile(htmlPath, { maxAge: 0 });
});

// Redirect any other path to root (SPA behavior + asked-for redirect)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  res.redirect('/');
});

// ---------- Boot ----------
(async () => {
  await initRedis();
  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
    console.log(`[server] serving ${htmlPath}`);
    console.log(`[server] state key: ${STATE_KEY}`);
  });
})();

// ---------- Graceful shutdown ----------
function shutdown(sig) {
  console.log(`[server] ${sig} received, shutting down`);
  if (redis && redisReady) {
    redis.quit().catch(() => {}).finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000);
  } else {
    process.exit(0);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
