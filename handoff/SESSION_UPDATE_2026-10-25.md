# Cập nhật bàn giao - 2026-10-25

Tài liệu bàn giao gốc được nhận từ `C:\Users\Admin\Downloads\files`. Thư mục
`handoff` chưa tồn tại trong workspace khi phiên này bắt đầu; tệp này ghi lại
những gì đã được xác minh trực tiếp sau đó.

## Trạng thái đã xác minh

- PostgreSQL chạy trực tiếp trên Windows: dịch vụ `postgresql-x64-18` đang hoạt
  động; `psql` 18.0 có sẵn. Node là 26.3.1.
- `npm run db:migrate -w server` thành công; schema có `users`,
  `publications`, `settings`, `sessions`.
- CSDL hiện có 3 user, 2 ấn phẩm và 5 settings. Các khoá settings là
  `school.name`, `school.logo`, `platform.name`, `platform.description`,
  `platform.favicon`.
- `settings.xml` thực tế dùng thẻ `<name>`, không dùng `<n>`; lỗi mapping
  `.n` được nêu trong bàn giao không áp dụng cho dữ liệu hiện tại.
- `db:import-xml --dry-run` thành công: 5 settings, 2 ấn phẩm, 0 file thiếu,
  1 file mồ côi đã biết. Không chạy import ghi thật vì dữ liệu đã hiện diện.
- `/api/health` qua Express trả HTTP 200 với `db:true`.
- `npm run assets:check -- --base=http://localhost:3000` thành công: 0 lỗi,
  2 cảnh báo font IE cũ đã biết.
- `npm run build` thành công.

## Sửa trong phiên này

- Sửa lệnh asset ở `package.json` để dùng hai script đang có tại
  `server/scripts/`.
- Sửa cách hai script đó xác định root dự án, từ `server/` thành
  `D:\flipbook`. Không di chuyển hoặc xoá tệp nào.

## Lưu ý hiện tại

- Không có Git repository trong `D:\flipbook`, `client`, hoặc `server`, nên
  không có trạng thái thay đổi/commit để đối chiếu.

## Giai đoạn 2: API công khai

- Đã thêm repository PostgreSQL và router public tại `server/src/repos/` và
  `server/src/routes/`, rồi mount vào Express.
- Có API site, danh sách/chi tiết ấn phẩm, PDF inline/Range, download, print
  và ảnh bìa. Chỉ ấn phẩm `published` được trả; API không lộ đường dẫn PDF.
- Đã xác minh thực tế: site/list/detail `200`, Range PDF `206`, download bị
  chặn `403` khi quyền tắt, ảnh bìa `200`, và PDF qua `/storage` là `404`.
- Cần bổ sung script kiểm thử tự động chuyên biệt trước khi coi toàn bộ Giai
  đoạn 2 là hoàn tất. Frontend công khai vẫn chưa bắt đầu.
