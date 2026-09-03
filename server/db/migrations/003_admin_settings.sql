CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id TEXT PRIMARY KEY,
  default_language TEXT NOT NULL DEFAULT 'English',
  default_retention TEXT NOT NULL DEFAULT '7 years',
  require_workflow_on_submit INTEGER NOT NULL DEFAULT 1,
  notify_on_document_events INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  workflow_enabled INTEGER NOT NULL DEFAULT 1,
  collaboration_enabled INTEGER NOT NULL DEFAULT 1,
  security_enabled INTEGER NOT NULL DEFAULT 1,
  system_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id,status);
