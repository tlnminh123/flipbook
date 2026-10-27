// Dùng chung cho import và (sau này) service ấn phẩm, để chuỗi tìm kiếm luôn cùng một cách tạo.
const norm = (v) => String(v ?? '').normalize('NFC').toLowerCase();

export function buildSearchText({ title, subtitle, description, author, editor, language, year }) {
  // Ngăn cách bằng \n để truy vấn có dấu cách không khớp xuyên ranh giới giữa hai trường.
  return [title, subtitle, description, author, editor, language, year ?? '']
    .map(norm)
    .join('\n');
}

export const normalizeQuery = norm;