-- ===========================================================================
-- Migration 0015: admin broadcasts.
--
-- Lets staff send an announcement to users either as an in-app notification,
-- an email, or both — to all active users or a hand-picked subset.
--
-- `admin_broadcasts` is an audit/history record of each send. The actual in-app
-- deliveries land in the existing `notifications` table (type
-- 'ADMIN_BROADCAST'); emails go through the email provider (or the outbox when
-- no provider is configured).
-- ===========================================================================

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id UUID REFERENCES users(id),
  subject TEXT,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  send_in_app BOOLEAN NOT NULL DEFAULT true,
  send_email BOOLEAN NOT NULL DEFAULT false,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'selected')),
  recipient_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  in_app_count INTEGER NOT NULL DEFAULT 0,
  email_sent_count INTEGER NOT NULL DEFAULT 0,
  email_failed_count INTEGER NOT NULL DEFAULT 0,
  email_configured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_created ON admin_broadcasts (created_at DESC);

-- Permission + grants for the privileged roles.
INSERT INTO permissions (name, description) VALUES
  ('comms.broadcast', 'Send announcements and emails to users')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'comms.broadcast'
WHERE r.name IN ('super_admin', 'admin', 'content_manager')
ON CONFLICT DO NOTHING;
