import { migrate, pool } from '../src/db/pool.ts';

try {
  await migrate();
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(`✓ Schema OK. Các bảng: ${rows.map(r => r.table_name).join(', ')}`);
} catch (e) {
  console.error('✗ migrate lỗi:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}