# PROJECT CONTEXT

## Nguồn và đích

- Legacy read-only: `D:\windows\xampp\htdocs`, PHP 8 + XML + XAMPP. Đây là repo Git, trạng thái lần cuối sạch trên `main`.
- Migration workspace: `D:\flipbook`, React/Vite + Express + PostgreSQL. Không có `.git` tại thời điểm bàn giao.
- Database chạy PostgreSQL trực tiếp Windows, không dùng Docker.

## Quyết định kỹ thuật còn hiệu lực

- Người dùng chọn TypeScript frontend/backend theo prompt gốc. Client đã bắt đầu TSX; backend còn cần chuyển.
- React Router + Vite ở client; Express + pg ở server; SQL có parameter binding.
- CSDL lưu metadata; PDF/cover giữ filesystem tại `server/storage/publications/<id>/`.
- `search_text` NFC + lower case, truy vấn LIKE có escape; sort Vietnamese Node `Intl.Collator`.
- Assets vendor reader giữ nguyên `client/public/assets`; nạp vendor global đúng thứ tự khi triển khai reader.
- Không static-serve toàn bộ storage; chỉ route cover whitelist ảnh. PDF chỉ endpoint có kiểm quyền/path boundary/Range.
- Không CSP chặn `eval` vì template reader cũ cần plugin eval.

## Schema và dữ liệu

- `users`: username unique insensitive-case, bcrypt hash legacy `$2y$` được `bcryptjs` xử lý qua chuyển prefix.
- `publications`: status `draft|published|archived`, permissions download/print/share, path tương đối, timestamps timestamptz.
- `settings`: school/platform values; actual XML keys import đúng `*.name`.
- `sessions`: dự kiến cho admin auth DB session + CSRF; chưa triển khai API admin.
- Import XML transaction, users không overwrite, publications/settings upsert; original XML luôn được giữ.

## Bảo mật

- Không log secrets/hash/password. `.env` và storage bị ignore.
- Validate input server-side; parameterized SQL; path traversal prevention; PDF signature; cookie/CSRF khi port admin.
- User dùng Windows CMD; tài liệu/lệnh hướng dẫn nên theo CMD.

## UX và reader

- UI phải gần PHP cũ, markup/CSS cũ không tự redesign.
- CSS từng trang load/gỡ theo route để tránh class conventions xung đột.
- Reader có iframe/template + jQuery, html2canvas, three r81, pdf.js cũ, 3dflipbook; worker config phải trước plugin. Chưa port hay xác minh WebGL.

## Giới hạn môi trường

- Node v26.3.1, PostgreSQL service v18, psql v18 từng xác minh.
- `npm audit` báo 1 moderate sau thêm TS backend; chưa remediation.
- Browser manual test là cần thiết cho reader/WebGL; không tuyên bố reader hoàn thành chỉ bằng build.
