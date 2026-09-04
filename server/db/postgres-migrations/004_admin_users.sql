ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at timestamptz;
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
