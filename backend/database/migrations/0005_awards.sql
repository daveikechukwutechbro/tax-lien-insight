-- ===========================================================================
-- Tax Lien Insight — Migration 0005: Awards, account fields, status alignment
-- ===========================================================================

-- Align user statuses with spec (active | pending_verification | suspended | banned | closed)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('active','pending_verification','suspended','banned','closed'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Funds account status
ALTER TABLE funds_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','suspended','closed'));

-- Awards (winning bid -> award, separate from certificate issuance)
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES auctions(id),
  auction_lot_id UUID NOT NULL REFERENCES auction_lots(id),
  user_id UUID NOT NULL REFERENCES users(id),
  certificate_id UUID REFERENCES certificates(id),
  principal_amount BIGINT NOT NULL DEFAULT 0,
  winning_interest_rate NUMERIC(8,4),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','won','payment_pending','payment_overdue','paid','defaulted','cancelled','certificate_pending','certificate_issued','redeemed','closed')),
  invoice_id UUID REFERENCES invoices(id),
  payment_id UUID REFERENCES payments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS award_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_id UUID REFERENCES users(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_awards_auction ON awards (auction_id);
CREATE INDEX IF NOT EXISTS idx_awards_user ON awards (user_id);
CREATE INDEX IF NOT EXISTS idx_awards_status ON awards (status);
