-- ===========================================================================
-- Tax Lien Insight — Migration 0009: lien display fields + notification read state
-- ===========================================================================

ALTER TABLE auction_lots
  ADD COLUMN IF NOT EXISTS taxes_owed BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_year INT,
  ADD COLUMN IF NOT EXISTS redemption_period_months INT NOT NULL DEFAULT 12;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_auction_lots_auction_status ON auction_lots (auction_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);