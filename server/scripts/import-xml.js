import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { XMLParser } from 'fast-xml-parser';
import { pool, migrate } from '../src/db/pool.js';
import { buildSearchText } from '../src/lib/searchText.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'dry-run': { type: 'boolean' }, tz: { type: 'string' } },
});
const xmlDir = positionals[0];
if (!xmlDir || !fs.existsSync(xmlDir)) {
  console.error('Cách dùng: npm run db:import-xml -w server -- "<thư mục storage\\xml của repo cũ>" [--dry-run] [--tz=+07:00]');
  process.exit(1);
}
const DRY = !!values['dry-run'];
const TZ = values.tz || '+07:00'; // XML cũ lưu giờ địa phương, không kèm múi giờ

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // giữ nguyên chuỗi ("0", "2026"), không tự ép số
  trimValues: true,
  isArray: (name) => name === 'publication' || name === 'user',
});

const s = (v) => (v == null || typeof v === 'object' ? '' : String(v).trim());
const bool = (v) => ['1', 'true', 'yes', 'on'].includes(s(v).toLowerCase());
const int = (v, d = 0) => { const n = parseInt(s(v), 10); return Number.isFinite(n) ? n : d; };
const NOW = new Date().toISOString();
function ts(v) {
  const x = s(v);
  if (!x) return null;
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(x) ? x.replace(' ', 'T') + TZ : x;
}
function safeRel(v, label, warn) {
  const x = s(v);
  if (!x) return '';
  if (x.includes('..') || x.startsWith('/') || /^[a-z]:/i.test(x)) { warn(`${label}: đường dẫn đáng ngờ "${x}", bỏ trống`); return ''; }
  return x.replace(/\\/g, '/');
}
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = s(v);
  }
  return out;
}
function readXml(name) {
  const f = path.join(xmlDir, name);
  if (!fs.existsSync(f)) { console.warn(`! Không thấy ${f}`); return null; }
  return parser.parse(fs.readFileSync(f, 'utf8'));
}
function upsertSql(table, row, conflict, update = true) {
  const cols = Object.keys(row);
  const ph = cols.map((_, i) => `$${i + 1}`).join(',');
  const set = cols.filter((c) => c !== conflict).map((c) => `${c}=EXCLUDED.${c}`).join(',');
  return {
    text: `INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph}) ON CONFLICT (${conflict}) DO ${update ? `UPDATE SET ${set}` : 'NOTHING'}`,
    values: Object.values(row),
  };
}

const warnings = [];
const warn = (m) => warnings.push(m);
const report = { settings: 0, usersNew: 0, usersSkipped: 0, pubs: 0, missingFiles: [], orphans: [] };

await migrate();
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // ---- settings
  const sdoc = readXml('settings.xml');
  if (sdoc?.settings) {
    for (const [key, value] of Object.entries(flatten(sdoc.settings))) {
      await client.query(
        'INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()',
        [key, value]
      );
      report.settings++;
    }
  }

  // ---- users (không ghi đè người dùng đã có, để chạy lại không làm mất mật khẩu đã đổi)
  const udoc = readXml('users.xml');
  const existing = await client.query('SELECT id, lower(username) AS u FROM users');
  const haveId = new Set(existing.rows.map((r) => r.id));
  const haveName = new Set(existing.rows.map((r) => r.u));
  for (const u of udoc?.users?.user ?? []) {
    const row = {
      id: s(u.id), username: s(u.username), password_hash: s(u.password_hash),
      display_name: s(u.display_name), email: s(u.email),
      role: s(u.role) || 'admin', status: s(u.status) || 'active',
      created_at: ts(u.created_at) ?? NOW,
      updated_at: ts(u.updated_at) ?? ts(u.created_at) ?? NOW,
      last_login_at: ts(u.last_login_at),
    };
    if (!row.id || !row.username || !row.password_hash) { warn(`User thiếu id/username/password_hash, bỏ qua: ${JSON.stringify(row.username)}`); continue; }
    if (haveId.has(row.id) || haveName.has(row.username.toLowerCase())) { report.usersSkipped++; continue; }
    const q = upsertSql('users', row, 'id', false);
    await client.query(q.text, q.values);
    haveId.add(row.id); haveName.add(row.username.toLowerCase());
    report.usersNew++;
  }

  // ---- publications
  const pdoc = readXml('publications.xml');
  const pubRoot = path.join(SERVER_DIR, 'storage', 'publications');
  for (const p of pdoc?.publications?.publication ?? []) {
    const st = p.settings ?? {};
    const yr = int(p.year, 0);
    const row = {
      id: s(p.id), slug: s(p.slug), title: s(p.title), subtitle: s(p.subtitle),
      year: yr >= 1900 && yr <= 2200 ? yr : null,
      description: s(p.description),
      cover: safeRel(p.cover, `${s(p.id)}.cover`, warn),
      source_pdf: safeRel(p.source_pdf, `${s(p.id)}.source_pdf`, warn),
      pdf: safeRel(p.pdf, `${s(p.id)}.pdf`, warn),
      page_count: Math.max(0, int(p.page_count, 0)),
      status: s(p.status) || 'draft',
      author: s(p.author), editor: s(p.editor), language: s(p.language),
      allow_download: bool(st.allow_download), allow_print: bool(st.allow_print), allow_share: bool(st.allow_share),
      created_at: ts(p.created_at) ?? NOW,
      updated_at: ts(p.updated_at) ?? ts(p.created_at) ?? NOW,
      published_at: ts(p.published_at),
    };
    if (!row.id || !row.slug || !row.title) { warn(`Ấn phẩm thiếu id/slug/title, bỏ qua: ${JSON.stringify(row.id)}`); continue; }
    if (!['draft', 'published', 'archived'].includes(row.status)) { warn(`${row.id}: status lạ "${row.status}", bỏ qua`); continue; }
    if (s(p.year) && row.year === null) warn(`${row.id}: year "${s(p.year)}" ngoài 1900–2200, lưu rỗng`);
    row.search_text = buildSearchText(row);

    const q = upsertSql('publications', row, 'id', true);
    await client.query(q.text, q.values);
    report.pubs++;

    for (const [label, rel] of [['cover', row.cover], ['pdf', row.pdf], ['source_pdf', row.source_pdf]]) {
      if (rel && !fs.existsSync(path.join(SERVER_DIR, rel))) report.missingFiles.push(`${row.id}.${label}: ${rel}`);
    }
    const dir = path.join(pubRoot, row.id);
    if (fs.existsSync(dir)) {
      const used = new Set([row.cover, row.pdf, row.source_pdf].filter(Boolean).map((x) => path.posix.basename(x)));
      for (const f of fs.readdirSync(dir)) if (!used.has(f)) report.orphans.push(`${row.id}/${f}`);
    }
  }

  await client.query(DRY ? 'ROLLBACK' : 'COMMIT');
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('\n✗ Import lỗi, đã rollback, không ghi gì:', e.message);
  if (e.detail) console.error('  chi tiết:', e.detail);
  process.exitCode = 1;
  client.release();
  await pool.end();
  process.exit(1);
}
client.release();

console.log(`\nNguồn XML : ${path.resolve(xmlDir)}`);
console.log(`Chế độ    : ${DRY ? 'DRY-RUN (đã rollback, DB không đổi)' : 'GHI THẬT'}`);
console.log(`Settings  : ${report.settings} khóa`);
console.log(`Users     : thêm ${report.usersNew}, bỏ qua ${report.usersSkipped} (đã có)`);
console.log(`Ấn phẩm   : ${report.pubs}`);
console.log(`File thiếu: ${report.missingFiles.length}`);
report.missingFiles.forEach((m) => console.log('  ✗ ' + m));
console.log(`File mồ côi (có trên đĩa, XML không trỏ tới): ${report.orphans.length}`);
report.orphans.forEach((m) => console.log('  ? ' + m));
if (warnings.length) { console.log(`Cảnh báo: ${warnings.length}`); warnings.forEach((w) => console.log('  ! ' + w)); }
await pool.end();