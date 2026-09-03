ALTER TABLE upload_sessions ADD COLUMN document_id TEXT REFERENCES documents(id);

