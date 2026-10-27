import { parseArgs } from 'node:util';
import crypto from 'node:crypto';
import { pool, migrate } from '../src/db/pool.ts';
import { hashPassword } from '../src/lib/password.ts';
import { ask } from '../src/lib/prompt.ts';

const { values } = parseArgs({
  options: {
    username: { type: 'string' }, password: { type: 'string' },
    name: { type: 'string' }, email: { type: 'string' }, reset: { type: 'boolean' },
  },
});

try {
  await migrate();
  const username = (values.username || (await ask('Tên đăng nhập: '))).trim();
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(username)) throw new Error('Tên đăng nhập 3–50 ký tự: chữ, số, . _ -');

  const found = await pool.query('SELECT id FROM users WHERE lower(username)=lower($1)', [username]);
  if (found.rowCount && !values.reset) throw new Error(`"${username}" đã tồn tại. Thêm --reset để đặt lại mật khẩu.`);

  let password = values.password;
  if (!password) {
    password = await ask('Mật khẩu: ', { hidden: true });
    const again = await ask('Nhập lại : ', { hidden: true });
    if (password !== again) throw new Error('Hai lần nhập mật khẩu không khớp.');
  }
  if (password.length < 8) throw new Error('Mật khẩu tối thiểu 8 ký tự.');
  const hash = await hashPassword(password);

  if (found.rowCount) {
    await pool.query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [hash, found.rows[0].id]);
    console.log(`✓ Đã đặt lại mật khẩu cho "${username}".`);
  } else {
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');
    await pool.query(
      `INSERT INTO users (id, username, password_hash, display_name, email, role, status)
       VALUES ($1,$2,$3,$4,$5,'admin','active')`,
      [id, username, hash, values.name || username, values.email || '']
    );
    console.log(`✓ Đã tạo admin "${username}" (${id}).`);
  }
} catch (e) {
  console.error('✗', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}