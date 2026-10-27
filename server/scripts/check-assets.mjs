#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ASSETS_DIR = path.join(ROOT, 'client', 'public', 'assets');
const PREFIX = '/assets';
const baseArg = process.argv.find((a) => a.startsWith('--base='));
const BASE = baseArg ? baseArg.slice(7).replace(/\/+$/, '') : null;

// CSS nạp qua template.styles: plugin tự viết lại url(), nhưng CHỈ nhận dạng có dấu nháy.
const PLUGIN_REWRITTEN_CSS = ['/assets/css/flipbook/black-book-view.css'];

const REQUIRED = [
  '/assets/js/flipbook/3dflipbook.min.js',
  '/assets/js/flipbook/pdf.min.js',
  '/assets/js/flipbook/pdf.worker.js',
  '/assets/js/flipbook/three.min.js',
  '/assets/js/flipbook/default-book-view.js',
  '/assets/templates/default-book-view.html',
  '/assets/css/flipbook/black-book-view.css',
  '/assets/css/flipbook/font-awesome.min.css',
  '/assets/css/reader.css',
  '/assets/sounds/start-flip.mp3',
  '/assets/sounds/end-flip.mp3',
];

const problems = [];
const warnings = [];
const refs = new Map(); // url -> Set(nơi tham chiếu)

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}
const toUrl = (abs) => PREFIX + '/' + path.relative(ASSETS_DIR, abs).split(path.sep).join('/');
const toFs = (url) => path.join(ASSETS_DIR, decodeURIComponent(url.slice(PREFIX.length)));

function resolveRef(ref, fromUrl) {
  if (!ref || /^(data:|#|mailto:|javascript:|tel:)/i.test(ref)) return null;
  if (/^(https?:)?\/\//i.test(ref)) return { external: ref };
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) return null;
  const url = clean.startsWith('/')
    ? clean
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromUrl), clean));
  return { url };
}
function addRef(url, from) {
  if (!refs.has(url)) refs.set(url, new Set());
  refs.get(url).add(from);
}

if (!fs.existsSync(ASSETS_DIR)) {
  console.error('Chưa có client/public/assets. Chạy: npm run assets:copy -- "<repo cũ>"');
  process.exit(1);
}

const files = walk(ASSETS_DIR);

for (const abs of files) {
  const from = toUrl(abs);
  const ext = path.extname(abs).toLowerCase();
  let text = null;
  if (ext === '.css' || ext === '.html') text = fs.readFileSync(abs, 'utf8');
  if (text === null) continue;

  const found = [];
  if (ext === '.css') {
    for (const m of text.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g)) {
      found.push({ ref: m[2].trim(), quoted: m[1] !== '' });
    }
    for (const m of text.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)/g)) {
      found.push({ ref: m[1], quoted: true });
    }
  } else {
    for (const m of text.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
      found.push({ ref: m[1], quoted: true });
    }
  }

  for (const { ref, quoted } of found) {
    const r = resolveRef(ref, from);
    if (!r) continue;
    if (r.external) {
      problems.push(`${from}: phụ thuộc tài nguyên NGOÀI: ${r.external}`);
      continue;
    }
    if (ext === '.css' && !quoted && PLUGIN_REWRITTEN_CSS.includes(from)) {
      problems.push(`${from}: url(${ref}) không có dấu nháy, plugin sẽ KHÔNG viết lại đường dẫn này`);
    }
    if (r.url.startsWith(PREFIX + '/')) addRef(r.url, from);
  }
}

// Tài nguyên bắt buộc + toàn bộ lib flipbook + âm thanh
for (const u of REQUIRED) addRef(u, '(bắt buộc)');
for (const abs of files) {
  const u = toUrl(abs);
  if (u.startsWith('/assets/js/flipbook/') || u.startsWith('/assets/sounds/')) addRef(u, '(thư mục lib)');
}
const flipJs = files.map((f) => path.basename(f).toLowerCase());
for (const re of [/jquery/, /html2canvas/]) {
  if (!flipJs.some((n) => re.test(n) && n.endsWith('.js'))) problems.push(`js/flipbook thiếu file khớp ${re}`);
}

// Kiểm tra tồn tại trên đĩa
for (const [url, froms] of refs) {
  if (fs.existsSync(toFs(url))) continue;
  const where = [...froms].join(', ');
  const legacyFont = /\/fonts\/.*\.(eot|svg)$/i.test(url);
  (legacyFont ? warnings : problems).push(
    legacyFont
      ? `${url} không có (chỉ IE cũ cần, trình duyệt hiện đại bỏ qua). Từ: ${where}`
      : `THIẾU file ${url}. Từ: ${where}`
  );
}

async function httpCheck(url) {
  try {
    const res = await fetch(BASE + url, { redirect: 'manual' });
    const type = res.headers.get('content-type') || '';
    const body = Buffer.from(await res.arrayBuffer());
    const ext = path.extname(url).toLowerCase();
    if (res.status !== 200) return `HTTP ${res.status}`;
    if (body.length === 0) return 'body rỗng';
    if (ext !== '.html' && /text\/html/i.test(type)) return `trả HTML (SPA fallback?) thay vì ${ext}`;
    if (ext === '.html' && body.toString('utf8').includes('id="root"')) return 'trả index.html của SPA thay vì template';
    if (ext === '.css' && !/css/i.test(type)) return `content-type lạ: ${type}`;
    if (ext === '.js' && !/javascript|ecmascript/i.test(type)) return `content-type lạ: ${type}`;
    return null;
  } catch (e) {
    return 'không kết nối được: ' + e.message;
  }
}

if (BASE) {
  console.log(`Kiểm tra HTTP ${refs.size} URL tại ${BASE} ...`);
  for (const url of refs.keys()) {
    if (!fs.existsSync(toFs(url))) continue; // đã báo thiếu ở trên
    const err = await httpCheck(url);
    if (err) problems.push(`HTTP ${url}: ${err}`);
  }
}

console.log(`\nĐã quét ${files.length} file, ${refs.size} URL tham chiếu.`);
if (warnings.length) { console.log(`\nCẢNH BÁO (${warnings.length}):`); warnings.forEach((w) => console.log('  ! ' + w)); }
if (problems.length) {
  console.log(`\nLỖI (${problems.length}):`);
  problems.forEach((p) => console.log('  ✗ ' + p));
  process.exit(1);
}
console.log('\n✓ Không có lỗi.');
