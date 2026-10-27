# NEXT STEPS

## 1. Xác minh startup sau TSX

- **Việc:** chạy `npm run typecheck -w client`, rồi `npm run dev` tại root; mở `http://localhost:5173` và kiểm `http://localhost:3000/api/health`.
- **Lý do:** log người dùng từng có 404 `/api/health`; backend đã xác minh riêng, nhưng chưa có kiểm thử tổng hợp sau TSX.
- **DoD:** client load, API health 200 qua proxy, không có Vite compile error.
- **Rủi ro:** chỉ chạy `npm run dev -w client` sẽ không khởi động Express.

## 2. Hoàn tất TypeScript backend

- **Việc:** thêm `server/tsconfig.json`; chuyển `src/index.js`, db, lib, repos, routes sang `.ts`; dùng `tsx` cho dev/start/CLI; thêm `typecheck` server.
- **Lý do:** đây là yêu cầu kiến trúc mới nhất của user và code backend hiện vẫn JavaScript.
- **DoD:** không còn JS runtime backend; `npm run typecheck -w server`, migration, health và public API chạy lại thành công.
- **Rủi ro:** đổi đuôi file có thể làm ESM import nhầm nếu giữ bản `.js`; thực hiện theo lát cắt, không đồng thời toàn bộ CLI.

## 3. Thêm kiểm thử API public tự động

- **Việc:** script test hoặc test runner gửi request tới site/list/detail/pdf range/download/storage.
- **Lý do:** các kiểm thử hiện có là thủ công.
- **DoD:** xác nhận published-only, Range 206, download/print permission, PDF storage 404, query escape `% _ \\`.
- **Rủi ro:** không làm import XML ghi thật chỉ để test.

## 4. Port frontend public

- **Việc:** đọc lại PHP markup/CSS, tạo pages/layout/hooks/API types cho `/`, publications, publication detail, search.
- **Lý do:** client hiện là placeholder.
- **DoD:** dùng API thay PHP/XML, CSS cũ nạp cô lập từng route, loading/empty/error state.
- **Rủi ro:** không import tất cả CSS global.

## 5. Tiếp tục admin/auth, reader và tài liệu

- Làm theo roadmap trong `PROJECT_CONTEXT.md`; đọc code PHP tương ứng trước mỗi feature để bảo toàn business rules.
