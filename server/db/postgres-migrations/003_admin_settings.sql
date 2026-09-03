CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id text PRIMARY KEY,
  default_language text NOT NULL DEFAULT 'English',
  default_retention text NOT NULL DEFAULT '7 years',
  require_workflow_on_submit boolean NOT NULL DEFAULT true,
  notify_on_document_events boolean NOT NULL DEFAULT true,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  workflow_enabled boolean NOT NULL DEFAULT true,
  collaboration_enabled boolean NOT NULL DEFAULT true,
  security_enabled boolean NOT NULL DEFAULT true,
  system_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id,status);
INSERT INTO schema_migrations(version) VALUES ('003_admin_settings.sql') ON CONFLICT DO NOTHING;
