const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL;

// ── Redis ──────────────────────────────────────────
let redis = null;
if (REDIS_URL) {
  redis = createClient({ url: REDIS_URL });
  redis.on('error', err => console.error('Redis error:', err));
  redis.connect().then(() => console.log('Redis connected')).catch(console.error);
}

// ── Static files ──────────────────────────────────
app.use(express.json());
app.use(express.static(__dirname));

// ── API: serve JSON data files ──────────────────────
const DATA_DIR = path.join(__dirname, 'data');

app.get('/api/data/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado: ' + name });
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(filePath);
});

// ── API: list available data files ──────────────────
app.get('/api/data', (req, res) => {
  if (!fs.existsSync(DATA_DIR)) return res.json([]);
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
  res.json(files);
});

// ── API: estado (Redis) ─────────────────────────────
app.get('/api/estado/:id', async (req, res) => {
  if (!redis) return res.json({ status: null });
  try {
    const val = await redis.get('estado:' + req.params.id);
    res.json({ status: val });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/estado/:id', async (req, res) => {
  if (!redis) return res.status(503).json({ error: 'Redis no disponible' });
  try {
    await redis.set('estado:' + req.params.id, req.body.status);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Routes ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'el_sistema_v10.html'));
});

app.get('/editor', (req, res) => {
  res.sendFile(path.join(__dirname, 'editor.html'));
});

// ── Start ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`El Sistema v10 corriendo en puerto ${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
  if (!fs.existsSync(DATA_DIR)) {
    console.warn('⚠ Carpeta data/ no encontrada. Crea data/ y coloca los JSON ahí.');
  }
});
