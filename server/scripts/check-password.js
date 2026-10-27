import { parseArgs } from 'node:util';
import { pool } from '../src/db/pool.ts';
import { verifyPassword } from '../src/lib/password.ts';
import { ask } from '../src/lib/prompt.ts';

const { values } = parseArgs({ options: { username: { type: 'string' } } });
try {
  const username = (values.username || (await ask('Tên đăng nhập: '))).trim();
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE lower(username)=lower($1)', [username]);
  if (!rows.length) throw new Error(`Không có user "${username}" trong DB.`);
  const kind = rows[0].password_hash.slice(0, 4);
  const pw = await ask('Mật khẩu: ', { hidden: true });
  console.log(`Loại hash: ${kind}…`);
  console.log((await verifyPassword(pw, rows[0].password_hash)) ? '✓ Mật khẩu KHỚP' : '✗ Mật khẩu KHÔNG khớp');
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}