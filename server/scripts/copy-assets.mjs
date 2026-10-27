#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DEST = path.join(ROOT, 'client', 'public', 'assets');

const oldRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!oldRoot || !fs.existsSync(path.join(oldRoot, 'assets'))) {
  console.error('Cách dùng: npm run assets:copy -- "<đường dẫn repo PHP cũ>"');
  console.error('Thư mục đó phải chứa assets/ (và admin/assets/).');
  process.exit(1);
}

// Code chết của bản PHP: không trang nào nạp.
const SKIP = new Set(['js/reader.js', 'js/main.js', 'js/admin.js', 'css/render.css', 'css/install.css']);
// assets/images và assets/fonts là bản sao của assets/css/images và assets/css/fonts.
// Chỉ bỏ file trùng NỘI DUNG; file không trùng thì giữ lại.
const DUP_DIRS = { images: 'css/images', fonts: 'css/fonts' };

const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const copied = [];
const skipped = [];

function copyTree(srcRoot, destRoot, { skip = new Set(), dupDirs = {} } = {}, rel = '') {
  const dir = path.join(srcRoot, rel);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      copyTree(srcRoot, destRoot, { skip, dupDirs }, r);
      continue;
    }
    const src = path.join(srcRoot, r);
    if (skip.has(r)) { skipped.push(`${r}  (code chết)`); continue; }
    const top = r.split('/')[0];
    if (dupDirs[top] && r.includes('/')) {
      const twin = path.join(srcRoot, dupDirs[top], r.slice(top.length + 1));
      if (fs.existsSync(twin) && md5(twin) === md5(src)) {
        skipped.push(`${r}  (trùng ${dupDirs[top]}/...)`);
        continue;
      }
    }
    const dest = path.join(destRoot, r);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied.push(path.relative(DEST, dest).split(path.sep).join('/'));
  }
}

copyTree(path.join(oldRoot, 'assets'), DEST, { skip: SKIP, dupDirs: DUP_DIRS });

const adminAssets = path.join(oldRoot, 'admin', 'assets');
if (fs.existsSync(adminAssets)) {
  // logout.css thực chất là template PHP bị lưu nhầm đuôi .css
  copyTree(adminAssets, path.join(DEST, 'admin'), { skip: new Set(['css/logout.css']) });
} else {
  console.warn('Không thấy admin/assets, bỏ qua CSS admin.');
}

console.log(`\nĐã copy ${copied.length} file vào client/public/assets/`);
console.log(`Bỏ qua ${skipped.length} file:`);
skipped.forEach((s) => console.log('  - ' + s));
console.log('\nCác file đã copy:');
copied.sort().forEach((c) => console.log('  ' + c));
