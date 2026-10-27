import bcrypt from 'bcryptjs';

export const hashPassword = (plain) => bcrypt.hash(plain, 12);

// PHP password_hash() sinh tiền tố $2y$; $2y$ và $2b$ là cùng thuật toán bcrypt,
// chỉ khác nhãn, nên đổi nhãn trước khi so sánh để chắc chắn bcryptjs nhận.
export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash.replace(/^\$2y\$/, '$2b$'));
}