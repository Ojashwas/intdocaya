BEGIN;
CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, email text NOT NULL, role text NOT NULL, status text NOT NULL CHECK(status IN ('invited','active','suspended','deprovisioned')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,email));
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,name));
CREATE TABLE IF NOT EXISTS folders (id text PRIMARY KEY, tenant_id text NOT NULL, workspace_id text NOT NULL REFERENCES workspaces(id), parent_id text REFERENCES folders(id), name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS documents (id text PRIMARY KEY, tenant_id text NOT NULL, workspace_id text NOT NULL REFERENCES workspaces(id), folder_id text REFERENCES folders(id), title text NOT NULL, document_number text NOT NULL, doc_type text NOT NULL, status text NOT NULL CHECK(status IN ('Draft','Under Review','Under Approval','Published','Superseded','Archived')), classification text NOT NULL CHECK(classification IN ('Public','Internal','Confidential','Restricted')), owner_id text NOT NULL, owner_name text NOT NULL, department text NOT NULL, library text NOT NULL, language text NOT NULL, source_path text, summary text NOT NULL DEFAULT '', retention text NOT NULL, legal_hold boolean NOT NULL DEFAULT false, current_revision integer NOT NULL DEFAULT 1 CHECK(current_revision > 0), next_review date NOT NULL, mime_type text, size_bytes bigint NOT NULL DEFAULT 0 CHECK(size_bytes >= 0), content_hash text, reviewer text NOT NULL, approver text NOT NULL, workflow_step integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, UNIQUE(tenant_id,document_number));
CREATE TABLE IF NOT EXISTS versions (id text PRIMARY KEY, tenant_id text NOT NULL, document_id text NOT NULL REFERENCES documents(id), version_no integer NOT NULL CHECK(version_no > 0), object_key text NOT NULL, size_bytes bigint NOT NULL CHECK(size_bytes >= 0), content_hash text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id,version_no));
CREATE TABLE IF NOT EXISTS acl_entries (id text PRIMARY KEY, tenant_id text NOT NULL, document_id text REFERENCES documents(id), folder_id text REFERENCES folders(id), principal_id text NOT NULL, principal_type text NOT NULL CHECK(principal_type IN ('user','group')), permission text NOT NULL CHECK(permission IN ('view','comment','edit','manage','owner')), inherited boolean NOT NULL DEFAULT false, expires_at timestamptz, CHECK(document_id IS NOT NULL OR folder_id IS NOT NULL));
CREATE TABLE IF NOT EXISTS tags (id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, color text NOT NULL, UNIQUE(tenant_id,name));
CREATE TABLE IF NOT EXISTS document_tags (document_id text NOT NULL REFERENCES documents(id), tag_id text NOT NULL REFERENCES tags(id), PRIMARY KEY(document_id,tag_id));
CREATE TABLE IF NOT EXISTS comments (id text PRIMARY KEY, tenant_id text NOT NULL, document_id text NOT NULL REFERENCES documents(id), actor_id text NOT NULL, body text NOT NULL, resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS workflows (id text PRIMARY KEY, tenant_id text NOT NULL, document_id text NOT NULL REFERENCES documents(id), name text NOT NULL, status text NOT NULL CHECK(status IN ('Pending','Approved','Changes requested','Rejected','Cancelled')), assignee_id text NOT NULL, due_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, tenant_id text NOT NULL, user_id text NOT NULL, category text NOT NULL, title text NOT NULL, body text NOT NULL, priority text NOT NULL CHECK(priority IN ('critical','normal','low')), read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_events (sequence bigserial PRIMARY KEY, id text UNIQUE NOT NULL, tenant_id text NOT NULL, actor_id text NOT NULL, actor_name text NOT NULL, action text NOT NULL, object_type text NOT NULL, object_id text, outcome text NOT NULL, request_id text NOT NULL, source_ip inet, user_agent text, detail jsonb NOT NULL DEFAULT '{}', previous_hash text, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS upload_sessions (id text PRIMARY KEY, tenant_id text NOT NULL, actor_id text NOT NULL, idempotency_key text NOT NULL, file_name text NOT NULL, mime_type text NOT NULL, size_bytes bigint NOT NULL, chunk_size integer NOT NULL, state text NOT NULL CHECK(state IN ('created','uploading','quarantined','scanning','clean','rejected','completed','cancelled')), received_bytes bigint NOT NULL DEFAULT 0, content_hash text, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,idempotency_key));
CREATE INDEX IF NOT EXISTS idx_documents_tenant_updated ON documents(tenant_id,updated_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_sequence ON audit_events(tenant_id,sequence DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(tenant_id,user_id,created_at DESC);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE acl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['documents','versions','acl_entries','workflows','notifications','audit_events','upload_sessions']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=table_name AND policyname='tenant_isolation') THEN
      EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''app.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))', table_name);
    END IF;
  END LOOP;
END $$;
INSERT INTO schema_migrations(version) VALUES ('001_initial.sql') ON CONFLICT DO NOTHING;
COMMIT;
