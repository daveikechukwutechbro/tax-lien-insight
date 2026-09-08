ALTER TABLE verification_tokens ADD COLUMN code_hash TEXT;

CREATE INDEX idx_verification_tokens_code_hash
  ON verification_tokens (code_hash)
  WHERE code_hash IS NOT NULL;