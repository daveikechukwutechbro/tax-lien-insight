-- Editable site content (admin-controlled copy for public pages).
CREATE TABLE IF NOT EXISTS site_content (
  slug TEXT PRIMARY KEY,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);