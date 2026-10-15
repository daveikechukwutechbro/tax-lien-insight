-- ===========================================================================
-- Migration 0014: grant the content.manage permission (added for editable site
-- content) to the privileged roles. Migration 0004 seeded roles/permissions
-- before content.manage existed, so no role could manage site content.
-- ===========================================================================

INSERT INTO permissions (name, description) VALUES
  ('content.manage', 'Manage public site content')
ON CONFLICT (name) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name = 'content.manage'
WHERE r.name IN ('super_admin', 'admin', 'content_manager')
ON CONFLICT DO NOTHING;
