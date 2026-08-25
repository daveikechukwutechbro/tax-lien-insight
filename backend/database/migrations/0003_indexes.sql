-- ===========================================================================
-- Tax Lien Insight — Migration 0003: Indexes
-- ===========================================================================

CREATE INDEX idx_users_email_normalized ON users (email_normalized);
CREATE INDEX idx_profiles_user ON profiles (user_id);
CREATE INDEX idx_user_roles_user ON user_roles (user_id);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_token ON sessions (token_hash);
CREATE INDEX idx_verification_tokens_user ON verification_tokens (user_id);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE INDEX idx_jurisdictions_parent ON jurisdictions (parent_id);
CREATE INDEX idx_jurisdictions_state ON jurisdictions (state_id);
CREATE INDEX idx_jurisdiction_rules_jurisdiction ON jurisdiction_rules (jurisdiction_id);
CREATE INDEX idx_jurisdiction_rule_versions_jur ON jurisdiction_rule_versions (jurisdiction_id);

CREATE INDEX idx_properties_jurisdiction ON properties (jurisdiction_id);
CREATE INDEX idx_properties_parcel ON properties (parcel_id);
CREATE INDEX idx_properties_status ON properties (status);
CREATE INDEX idx_properties_address_trgm ON properties USING gin (address gin_trgm_ops);
CREATE INDEX idx_properties_city_trgm ON properties USING gin (city gin_trgm_ops);

CREATE INDEX idx_auctions_status ON auctions (status);
CREATE INDEX idx_auctions_jurisdiction ON auctions (jurisdiction_id);
CREATE INDEX idx_auction_lots_auction ON auction_lots (auction_id);
CREATE INDEX idx_auction_lots_status ON auction_lots (status);
CREATE INDEX idx_auction_lots_winning ON auction_lots (winning_bid_id);
CREATE INDEX idx_auction_registrations_auction ON auction_registrations (auction_id);
CREATE INDEX idx_auction_registrations_user ON auction_registrations (user_id);

CREATE INDEX idx_bids_lot ON bids (lot_id);
CREATE INDEX idx_bids_user ON bids (user_id);
CREATE INDEX idx_bids_auction ON bids (auction_id);
CREATE INDEX idx_bids_winner ON bids (is_current_winner) WHERE is_current_winner = true;
CREATE INDEX idx_bid_holds_account ON fund_holds (funds_account_id);
CREATE INDEX idx_bid_holds_bid ON bid_holds (bid_id);

CREATE INDEX idx_funds_accounts_user ON funds_accounts (user_id);
CREATE INDEX idx_ledger_account ON ledger_entries (funds_account_id);
CREATE INDEX idx_ledger_reference ON ledger_entries (reference_type, reference_id);
CREATE INDEX idx_fund_holds_account ON fund_holds (funds_account_id);
CREATE INDEX idx_fund_holds_status ON fund_holds (status);

CREATE INDEX idx_crypto_deposits_user ON crypto_deposits (user_id);
CREATE INDEX idx_crypto_deposits_status ON crypto_deposits (status);
CREATE INDEX idx_crypto_deposits_hash ON crypto_deposits (transaction_hash);

CREATE INDEX idx_invoices_user ON invoices (user_id);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_payments_user ON payments (user_id);

CREATE INDEX idx_certificates_holder ON certificates (holder_id);
CREATE INDEX idx_certificates_number ON certificates (certificate_number);
CREATE INDEX idx_certificates_status ON certificates (status);
CREATE INDEX idx_certificates_jurisdiction ON certificates (jurisdiction_id);

CREATE INDEX idx_redemptions_certificate ON redemptions (certificate_id);
CREATE INDEX idx_redemptions_holder ON redemptions (holder_id);
CREATE INDEX idx_redemptions_status ON redemptions (status);

CREATE INDEX idx_kyc_user ON kyc_verifications (user_id);
CREATE INDEX idx_kyc_status ON kyc_verifications (status);

CREATE INDEX idx_documents_owner ON documents (owner_id);
CREATE INDEX idx_documents_resource ON documents (resource_type, resource_id);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_audit_action ON audit_logs (action);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp);
CREATE INDEX idx_webhook_idempotency ON webhook_events (idempotency_key);
CREATE INDEX idx_jobs_status_run ON jobs (status, run_at);
CREATE INDEX idx_saved_searches_user ON saved_searches (user_id);
CREATE INDEX idx_watchlist_user ON watchlist (user_id);
