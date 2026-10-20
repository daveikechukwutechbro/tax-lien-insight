-- ===========================================================================
-- Migration 0016: per-record visibility toggles.
--
-- Admins can hide a property or an individual auction lot from the public site
-- without deleting it. Hidden records remain fully visible in the admin panel.
-- Default true so existing rows keep showing.
-- ===========================================================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE auction_lots ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_properties_visible ON properties (is_visible) WHERE is_visible = false;
CREATE INDEX IF NOT EXISTS idx_auction_lots_visible ON auction_lots (is_visible) WHERE is_visible = false;
