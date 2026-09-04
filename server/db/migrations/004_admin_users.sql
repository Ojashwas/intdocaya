ALTER TABLE users ADD COLUMN updated_at TEXT;
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
