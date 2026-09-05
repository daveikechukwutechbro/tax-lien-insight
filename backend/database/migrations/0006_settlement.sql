-- ===========================================================================
-- Tax Lien Insight — Migration 0006: Settlement categories + duplicate-credit
-- protection for USDC transactions.
--
-- Financial flows are categorized so platform revenue is NEVER conflated with
-- auction/tax-sale proceeds. Categories:
--   customer_deposit                inbound verified user funds
--   auction_proceeds                amounts owed toward won auctions
--   taxing_authority_proceeds       funds legally due to the taxing authority
--   authorized_operator_proceeds    funds due to the contractually authorized operator
--   platform_fee                    platform service revenue
--   network_fee                     blockchain/network costs
--   refund / internal               compensating and operational entries
-- ===========================================================================

ALTER TABLE ledger_entries ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_category_check;
ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_category_check
  CHECK (category IS NULL OR category IN (
    'customer_deposit',
    'platform_fee',
    'auction_proceeds',
    'taxing_authority_proceeds',
    'authorized_operator_proceeds',
    'refund',
    'network_fee',
    'internal'
  ));

CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries (category);
CREATE INDEX IF NOT EXISTS idx_ledger_account_category ON ledger_entries (funds_account_id, category);

-- ---------------------------------------------------------------------------
-- Duplicate credit protection: the same on-chain transaction can only ever be
-- credited once per network + token contract. Partial index keeps NULL-hash
-- intents unaffected.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_crypto_deposits_tx_identity
  ON crypto_deposits (network_code, token_contract, transaction_hash)
  WHERE transaction_hash IS NOT NULL;
