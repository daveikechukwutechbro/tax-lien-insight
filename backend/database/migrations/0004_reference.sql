-- ===========================================================================
-- Tax Lien Insight — Migration 0004: Reference data (roles & permissions)
-- ===========================================================================

INSERT INTO permissions (name, description) VALUES
  ('auction.create', 'Create auctions'),
  ('auction.publish', 'Publish auctions'),
  ('auction.pause', 'Pause/resume auctions'),
  ('auction.close', 'Close auctions'),
  ('property.create', 'Create property records'),
  ('property.edit', 'Edit property records'),
  ('bid.view', 'View bids'),
  ('bid.review', 'Review bids'),
  ('user.view', 'View users'),
  ('user.suspend', 'Suspend/unsuspend users'),
  ('kyc.review', 'Review KYC submissions'),
  ('funds.view', 'View funds/ledger'),
  ('funds.adjust', 'Adjust user balances'),
  ('certificate.issue', 'Issue certificates'),
  ('certificate.revoke', 'Revoke certificates'),
  ('redemption.view', 'View redemptions'),
  ('redemption.manage', 'Manage redemptions'),
  ('audit.view', 'View audit logs'),
  ('system.manage', 'Manage system settings')
ON CONFLICT (name) DO NOTHING;

-- Roles (idempotent: match by name and wire permissions)
DO $$
DECLARE
  r RECORD;
  perm_id UUID;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'bidder','verified_bidder','support_agent','kyc_reviewer','auction_manager',
    'property_manager','finance_manager','compliance_officer','content_manager',
    'auditor','admin','super_admin'
  ]) AS role_name
  LOOP
    INSERT INTO roles (name, description)
    VALUES (r.role_name, r.role_name || ' role')
    ON CONFLICT (name) DO NOTHING;
  END LOOP;

  -- Wire permissions per role
  FOR r IN SELECT unnest(ARRAY[
    'bidder','verified_bidder','support_agent','kyc_reviewer','auction_manager',
    'property_manager','finance_manager','compliance_officer','content_manager',
    'auditor','admin','super_admin'
  ]) AS role_name
  LOOP
    FOR perm_id IN
      SELECT p.id FROM permissions p
      WHERE p.name = ANY(get_role_permissions(r.role_name))
    LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT roles.id, perm_id FROM roles WHERE roles.name = r.role_name
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_role_permissions(role_name TEXT)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE role_name
    WHEN 'bidder' THEN ARRAY[]::TEXT[]
    WHEN 'verified_bidder' THEN ARRAY['bid.view']
    WHEN 'support_agent' THEN ARRAY['user.view','bid.view']
    WHEN 'kyc_reviewer' THEN ARRAY['kyc.review','user.view']
    WHEN 'auction_manager' THEN ARRAY['auction.create','auction.publish','auction.pause','auction.close','bid.view']
    WHEN 'property_manager' THEN ARRAY['property.create','property.edit']
    WHEN 'finance_manager' THEN ARRAY['funds.view','funds.adjust','certificate.issue','certificate.revoke','redemption.manage']
    WHEN 'compliance_officer' THEN ARRAY['audit.view','kyc.review','user.view']
    WHEN 'content_manager' THEN ARRAY['property.edit']
    WHEN 'auditor' THEN ARRAY['audit.view','user.view','bid.view','funds.view','kyc.review','redemption.view']
    WHEN 'admin' THEN ARRAY['auction.create','auction.publish','auction.pause','auction.close','property.create','property.edit','bid.view','bid.review','user.view','user.suspend','kyc.review','funds.view','funds.adjust','certificate.issue','certificate.revoke','redemption.view','redemption.manage','audit.view','system.manage']
    WHEN 'super_admin' THEN ARRAY['auction.create','auction.publish','auction.pause','auction.close','property.create','property.edit','bid.view','bid.review','user.view','user.suspend','kyc.review','funds.view','funds.adjust','certificate.issue','certificate.revoke','redemption.view','redemption.manage','audit.view','system.manage']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql;
