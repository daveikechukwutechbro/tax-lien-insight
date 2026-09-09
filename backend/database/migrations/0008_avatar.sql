-- Auction Ledger — Migration 0008: Profile avatar + KYC reference fields.
-- avatar_data stores a small data URL (base64) so users can upload a photo
-- without external object storage.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_data TEXT;