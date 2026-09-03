BEGIN;
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS document_id text REFERENCES documents(id);
INSERT INTO schema_migrations(version) VALUES ('002_upload_document.sql') ON CONFLICT DO NOTHING;
COMMIT;

