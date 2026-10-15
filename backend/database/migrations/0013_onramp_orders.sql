-- Card / fiat on-ramp orders (e.g. Transak).
-- A user pays by card at the provider; the provider buys USDC and delivers it to
-- the platform's designated USDC wallet. We independently verify the on-chain
-- delivery before crediting the user's internal USDC balance. The provider is
-- never trusted to move the internal ledger by itself.
CREATE TABLE IF NOT EXISTS onramp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  funds_account_id UUID NOT NULL REFERENCES funds_accounts(id),
  provider TEXT NOT NULL DEFAULT 'transak',
  provider_order_id TEXT,
  partner_order_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  fiat_amount_cents BIGINT NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'USD',
  crypto_symbol TEXT NOT NULL DEFAULT 'USDC',
  network TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  quoted_crypto_cents BIGINT,
  delivered_crypto_cents BIGINT,
  transaction_hash TEXT,
  block_number BIGINT,
  widget_url TEXT,
  failure_reason TEXT,
  raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_onramp_orders_user ON onramp_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onramp_orders_provider_order ON onramp_orders(provider, provider_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onramp_orders_partner_order ON onramp_orders(partner_order_id);
CREATE INDEX IF NOT EXISTS idx_onramp_orders_tx ON onramp_orders(transaction_hash);
