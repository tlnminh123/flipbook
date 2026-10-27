-- Idempotent: chạy lại bao nhiêu lần cũng được.
-- users.role / users.status chưa đặt CHECK vì mình chưa đối chiếu lại danh sách giá trị
-- hợp lệ của bản PHP. Sẽ siết ở giai đoạn 3 khi viết API user.

CREATE TABLE IF NOT EXISTS users (
  id             text PRIMARY KEY,
  username       text NOT NULL,
  password_hash  text NOT NULL,
  display_name   text NOT NULL DEFAULT '',
  email          text NOT NULL DEFAULT '',
  role           text NOT NULL DEFAULT 'admin',
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  last_login_at  timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (lower(username));

CREATE TABLE IF NOT EXISTS publications (
  id              text PRIMARY KEY,
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  subtitle        text NOT NULL DEFAULT '',
  year            integer CHECK (year IS NULL OR year BETWEEN 1900 AND 2200),
  description     text NOT NULL DEFAULT '',
  -- Đường dẫn tương đối kiểu bản cũ: storage/publications/<id>/<file>
  cover           text NOT NULL DEFAULT '',
  source_pdf      text NOT NULL DEFAULT '',
  pdf             text NOT NULL DEFAULT '',
  page_count      integer NOT NULL DEFAULT 0 CHECK (page_count >= 0),
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  author          text NOT NULL DEFAULT '',
  editor          text NOT NULL DEFAULT '',
  language        text NOT NULL DEFAULT '',
  allow_download  boolean NOT NULL DEFAULT false,
  allow_print     boolean NOT NULL DEFAULT false,
  allow_share     boolean NOT NULL DEFAULT true,
  -- Chuỗi đã hạ chữ thường (NFC) để tìm kiếm, không phụ thuộc locale của DB.
  search_text     text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz
);
CREATE INDEX IF NOT EXISTS publications_status_idx ON publications (status);
CREATE INDEX IF NOT EXISTS publications_year_idx   ON publications (year);

CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,           -- vd: school.name, platform.description
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                text PRIMARY KEY,    -- sha256(sid) dạng hex; cookie giữ sid thô
  user_id           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_activity_at  timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions (user_id);