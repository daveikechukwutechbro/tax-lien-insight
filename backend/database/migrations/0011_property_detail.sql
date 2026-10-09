-- Property detail fields: gallery, video, tax/interest and owner/photo info.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gallery JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS year_built INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS living_area_sqft INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS lot_size_acres NUMERIC(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bedrooms INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathrooms NUMERIC(4,1);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS use_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_mailing_address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS taxes_owed BIGINT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS interest_rate NUMERIC(8,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS tax_year INT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS redemption_period_months INT DEFAULT 12;