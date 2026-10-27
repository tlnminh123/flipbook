import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { pool, migrate } from './db/pool.js';
import publicRoutes, { storageRouter } from './routes/public.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.PORT || 3000);

const dist = path.join(ROOT, 'client', 'dist');
const webRoot = fs.existsSync(path.join(dist, 'index.html'))
  ? dist
  : path.join(ROOT, 'client', 'public');

try {
  await migrate();
} catch (e) {
  console.error('Không kết nối/migrate được PostgreSQL:', e.message);
  console.error('Kiểm tra DATABASE_URL trong server/.env và DB đã chạy chưa.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', async (req, res) => {
  let db = false;
  try { await pool.query('SELECT 1'); db = true; } catch { /* db=false */ }
  res.status(db ? 200 : 503).json({ ok: db, db, webRoot: path.relative(ROOT, webRoot) });
});

app.use('/api', publicRoutes);
app.use('/', storageRouter);
app.use('/assets', express.static(path.join(webRoot, 'assets'), { maxAge: '1d' }));
app.use('/assets', (req, res) => res.status(404).type('text/plain').send('Not found'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}  (static: ${path.relative(ROOT, webRoot)})`);
});
