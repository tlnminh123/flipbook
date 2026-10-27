# CONTINUATION - Bàn giao phiên làm việc

> **Hướng dẫn cho AI tiếp quản:** Đọc toàn bộ `handoff/CONTINUATION.md`, sau đó đọc `handoff/NEXT_STEPS.md`, `handoff/PROJECT_CONTEXT.md` và `handoff/CHANGELOG_HANDOFF.md`. Tiếp theo, kiểm tra trạng thái workspace hiện tại trước khi sửa code. Xác nhận với người dùng những điểm mơ hồ hoặc có rủi ro cao. Tiếp tục từ trạng thái thực tế được ghi nhận, không làm lại công việc đã hoàn thành, không tự ý mở rộng phạm vi và không ghi đè các thay đổi có sẵn.

## Mục tiêu

Chuyển ứng dụng thư viện ấn phẩm PHP/XML tại `D:\windows\xampp\htdocs` thành React + Node.js + PostgreSQL tại `D:\flipbook`. Prompt gốc mới nhất của người dùng yêu cầu TypeScript cho frontend và backend. Thành phẩm không phụ thuộc PHP, XML hay XAMPP để vận hành; XML gốc chỉ là nguồn import/backup.

## Ràng buộc của người dùng

- Không sửa, xóa, đổi tên hoặc ghi đè mã/data trong `D:\windows\xampp\htdocs`.
- Ưu tiên: toàn vẹn dữ liệu, giữ chức năng, tương thích UI/behavior cũ, bảo mật, bảo trì, hiệu năng.
- Dùng PostgreSQL cài trực tiếp Windows (dịch vụ `postgresql-x64-18` từng được xác nhận chạy), không Docker.
- Giữ assets và reader vendor cũ; không thay jQuery/three/pdf.js/3dflipbook bằng bản npm mới.
- Đường dẫn PDF không bao giờ phục vụ static; ảnh bìa chỉ qua route có whitelist extension.
- Không ghi bí mật từ `server/.env` vào code hoặc tài liệu.
- Người dùng vừa yêu cầu dừng phát triển và chỉ bàn giao; phiên sau mới tiếp tục.

## Kiến trúc thực tế

- Root npm workspaces: `client`, `server`; Node v26.3.1 từng được xác minh.
- Client: Vite 5, React 18, React Router 6. Source runtime hiện là TypeScript: `client/src/main.tsx`, `client/src/App.tsx`; `client/tsconfig.json` strict. UI vẫn chỉ là màn hình tạm giai đoạn 0.
- Server: Express 4, `pg`, PostgreSQL, ESM JavaScript hiện tại. TypeScript/tsx/type packages đã được cài nhưng **server source và CLI chưa chuyển sang `.ts`**.
- Database: schema idempotent `server/src/db/schema.sql`; bảng `users`, `publications`, `settings`, `sessions`.
- Assets: `client/public/assets`; script root `package.json` gọi `server/scripts/copy-assets.mjs` và `check-assets.mjs`.

## Trạng thái đã xác minh

- PostgreSQL schema migrate thành công. DB có 3 users, 2 publications, 5 settings.
- Dry-run import XML thành công: 5 settings, 2 publications, 0 file thiếu, 1 PDF mồ côi đã biết. XML thực dùng `<name>`, không phải `<n>`.
- Express `/api/health` từng trả HTTP 200 với `db:true`.
- API public đã có site, list/detail publication, PDF Range, download/print permission, cover images. Đã kiểm site/list/detail 200, Range PDF 206, download 403 khi bị tắt, cover 200, PDF qua `/storage` 404.
- `npm run assets:check -- --base=http://localhost:3000` từng qua với 0 lỗi, 2 cảnh báo font IE cũ.
- `npm run build` từng qua trước migration TypeScript. Sau migration TSX, `npm run typecheck -w client` đã qua; **chưa chạy lại build client sau TSX trong phiên cuối**.
- Vite log người dùng có `/api/health` 404 tại thời điểm chạy client. Cấu hình proxy `client/vite.config.js` đúng; backend sau đó được kiểm trực tiếp tại port 3000 và health trả 200. Khả năng cao client được chạy riêng hoặc process Vite cũ; cần xác minh bằng `npm run dev` từ root.

## Hoàn thành

- Foundation workspaces, assets reader, PostgreSQL schema/import CLI/admin CLI.
- Public API JavaScript: `server/src/repos/publications.js`, `server/src/routes/public.js`, mount ở `server/src/index.js`.
- Frontend TypeScript foundation: `client/src/*.tsx`, `client/tsconfig.json`, typecheck script.
- Handoff cũ: `handoff/SESSION_UPDATE_2026-10-25.md`.

## Chưa hoàn thành / rủi ro

- Backend/CLI chưa TypeScript, chưa có `server/tsconfig.json`, backend typecheck hoặc build production TS.
- Client chưa port các trang public thật, admin, authentication, upload CRUD, reader, redirect legacy URL, README/deployment.
- API public thiếu test script tự động; chỉ có các kiểm thủ công đã ghi.
- Không có Git repository tại `D:\flipbook`; không thể xem diff/commit hoặc phân biệt tuyệt đối mọi thay đổi lịch sử. Legacy repo sạch `main...origin/main` ở lần kiểm cuối.
- `favicon.ico` ở root client có thể 404; file thật hiện ở `/assets/favicon.ico`.
- `npm audit` khi cài TypeScript backend báo 1 moderate vulnerability; chưa chạy `npm audit fix` để tránh thay đổi ngoài phạm vi.

## Thay đổi cần xử lý cẩn thận

- Server runtime vẫn import `.js`. Khi chuyển sang TS, chuyển có thứ tự và cập nhật script `tsx`; không để JS/TS cùng basename gây import nhầm.
- Không đổi `server/.env`. `.env` có `PORT`, `NODE_ENV`, `DATABASE_URL`, nhưng giá trị không được ghi nhận.
- Không import XML ghi thật nếu chưa cần: dữ liệu DB đang có; dry-run đã xác nhận.
- Đừng mở rộng UI/design khác giao diện PHP; mỗi page CSS cũ chỉ được load theo route để tránh CSS leak.

## Lệnh quan trọng (CMD, tại D:\flipbook)

```cmd
npm run dev
npm run dev -w server
npm run dev -w client
npm run typecheck -w client
npm run build
npm run db:migrate -w server
npm run db:import-xml -w server -- "D:\windows\xampp\htdocs\storage\xml" --dry-run
npm run assets:check
npm run assets:check -- --base=http://localhost:3000
```

`npm run dev` phải chạy cả server lẫn client; không kết luận proxy lỗi chỉ vì chạy Vite client riêng.

## Điểm dừng chính xác

Người dùng xác nhận tuân theo prompt gốc, do đó frontend bắt đầu chuyển sang TypeScript. `main.jsx`/`App.jsx` đã được thay bằng TSX và client typecheck thành công. Backend TypeScript packages đã cài nhưng source vẫn JavaScript. Ngay sau đó người dùng yêu cầu tạo handoff và cấm tiếp tục feature work.

**Hành động đầu tiên phiên mới:** kiểm tra `npm run typecheck -w client` và `npm run dev` từ root, rồi lập kế hoạch/chuyển backend runtime JavaScript sang TypeScript trước khi port thêm tính năng.
