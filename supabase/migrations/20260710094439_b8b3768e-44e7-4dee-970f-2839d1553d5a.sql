
-- 1. Extend properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS year_built integer,
  ADD COLUMN IF NOT EXISTS living_area_sqft integer,
  ADD COLUMN IF NOT EXISTS lot_size_acres numeric(10,2),
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(4,1),
  ADD COLUMN IF NOT EXISTS use_type text,
  ADD COLUMN IF NOT EXISTS land_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS improvement_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_mailing_address text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT '{}'::text[];

-- 2. Extend liens (tax_year already exists as NOT NULL; only add if missing on old schemas)
ALTER TABLE public.liens
  ADD COLUMN IF NOT EXISTS redemption_period_months integer NOT NULL DEFAULT 24;

-- 3. Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_balance numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- 4. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Documents are public" ON public.documents;
CREATE POLICY "Documents are public" ON public.documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert documents" ON public.documents;
CREATE POLICY "Admins insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update documents" ON public.documents;
CREATE POLICY "Admins update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete documents" ON public.documents;
CREATE POLICY "Admins delete documents" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Auction registrations
CREATE TABLE IF NOT EXISTS public.auction_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.auction_registrations TO authenticated;
GRANT ALL ON public.auction_registrations TO service_role;
ALTER TABLE public.auction_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own registrations" ON public.auction_registrations;
CREATE POLICY "Users see own registrations" ON public.auction_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users register themselves" ON public.auction_registrations;
CREATE POLICY "Users register themselves" ON public.auction_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users unregister themselves" ON public.auction_registrations;
CREATE POLICY "Users unregister themselves" ON public.auction_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 6. Admin-write policies (drop-if-exists for idempotency)
DO $$
DECLARE t text; a text;
BEGIN
  FOREACH t IN ARRAY ARRAY['counties','properties','auctions','liens'] LOOP
    FOREACH a IN ARRAY ARRAY['insert','update','delete'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS "Admins %s %s" ON public.%I', a, t, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Admins insert counties" ON public.counties FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update counties" ON public.counties FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete counties" ON public.counties FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert properties" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update properties" ON public.properties FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete properties" ON public.properties FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert auctions" ON public.auctions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update auctions" ON public.auctions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete auctions" ON public.auctions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert liens" ON public.liens FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update liens" ON public.liens FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete liens" ON public.liens FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Bootstrap admin function
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_has_admin boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_admin;
  IF v_has_admin THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

-- 8. Seed richer property data
DO $$
DECLARE
  v_property_count int;
  v_franklin uuid; v_cook uuid; v_harris uuid; v_maricopa uuid;
  v_auction uuid;
  v_new_property uuid;
  v_amount numeric(10,2);
  v_row record;
BEGIN
  SELECT count(*) INTO v_property_count FROM public.properties;
  IF v_property_count >= 18 THEN
    RETURN;
  END IF;

  INSERT INTO public.counties (name, state) VALUES
    ('Franklin', 'FL'), ('Cook', 'IL'), ('Harris', 'TX'), ('Maricopa', 'AZ')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_franklin FROM public.counties WHERE name='Franklin' AND state='FL' LIMIT 1;
  SELECT id INTO v_cook FROM public.counties WHERE name='Cook' AND state='IL' LIMIT 1;
  SELECT id INTO v_harris FROM public.counties WHERE name='Harris' AND state='TX' LIMIT 1;
  SELECT id INTO v_maricopa FROM public.counties WHERE name='Maricopa' AND state='AZ' LIMIT 1;

  SELECT id INTO v_auction FROM public.auctions WHERE status='scheduled' ORDER BY starts_at LIMIT 1;
  IF v_auction IS NULL THEN
    INSERT INTO public.auctions (title, county_id, status, starts_at, ends_at)
    VALUES ('Multi-County Tax Lien Auction', v_franklin, 'scheduled',
            now() + interval '14 days', now() + interval '14 days 6 hours')
    RETURNING id INTO v_auction;
  END IF;

  FOR v_row IN
    SELECT * FROM (VALUES
      ('Franklin-FL','22-05-17-1234-0000-0011','123 Oak Street','Apalachicola','FL','32320','residential','Single Family Residence','https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600',2005,2156,0.25,4,2.5,'Single Family Residence',280000,85000,195000,'Jane Doe','456 Pine Ave, Apalachicola, FL 32320',5642.18),
      ('Franklin-FL','22-05-17-1234-0000-0012','456 Maple Avenue','Apalachicola','FL','32320','residential','Single Family Residence','https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600',1998,2450,0.30,4,3,'Single Family Residence',305000,92000,213000,'Bob Smith','789 Cedar Rd',3210.75),
      ('Franklin-FL','22-05-17-1234-0000-0013','789 Pine Road','Apalachicola','FL','32320','land','Vacant Land','https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600',NULL,NULL,2.45,NULL,NULL,'Vacant Land',65000,65000,0,'Land Holdings LLC','PO Box 22',8987.64),
      ('Franklin-FL','22-05-17-1234-0000-0014','321 Cedar Lane','Apalachicola','FL','32320','residential','Single Family Residence','https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600',2010,1980,0.22,3,2,'Single Family Residence',245000,78000,167000,'Carol White','321 Cedar Ln',2150.00),
      ('Franklin-FL','22-05-17-1234-0000-0015','654 Birch Boulevard','Apalachicola','FL','32320','residential','Single Family Residence','https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600',2001,2100,0.28,3,2.5,'Single Family Residence',265000,82000,183000,'David Green','654 Birch Blvd',4875.90),
      ('Franklin-FL','22-05-17-1234-0000-0016','210 Bay Street','Apalachicola','FL','32320','residential','Cottage','https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600',1978,1320,0.18,2,1,'Single Family Residence',195000,70000,125000,'E. Rowe','210 Bay St',3125.00),
      ('Cook-IL','14-08-22-0100-0000-0001','2211 Lakeshore Dr','Chicago','IL','60614','residential','Condominium','https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600',2015,1250,0.02,2,2,'Condominium',420000,60000,360000,'M. Johnson','2211 Lakeshore Dr #402',7250.30),
      ('Cook-IL','14-08-22-0100-0000-0002','987 W Diversey','Chicago','IL','60614','residential','Two-Flat','https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600',1922,2800,0.10,4,3,'Multi-Family',510000,140000,370000,'Diversey Trust','987 W Diversey',9420.00),
      ('Cook-IL','14-08-22-0100-0000-0003','4520 N Kimball','Chicago','IL','60625','commercial','Mixed-Use','https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600',1965,6800,0.20,NULL,NULL,'Commercial',780000,220000,560000,'Kimball Holdings','4520 N Kimball',12480.75),
      ('Harris-TX','087-005-000-0001','1420 Heights Blvd','Houston','TX','77008','residential','Single Family Residence','https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=600',1998,2650,0.19,4,3,'Single Family Residence',465000,130000,335000,'R. Alvarez','1420 Heights Blvd',6120.40),
      ('Harris-TX','087-005-000-0002','3300 Kirby Dr','Houston','TX','77098','commercial','Retail','https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600',1988,12000,0.85,NULL,NULL,'Commercial Retail',1850000,620000,1230000,'Kirby Retail LP','3300 Kirby Dr',24500.00),
      ('Harris-TX','087-005-000-0003','712 W 22nd','Houston','TX','77008','residential','Bungalow','https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600',1935,1580,0.14,3,2,'Single Family Residence',315000,105000,210000,'Heights LLC','712 W 22nd',4320.25),
      ('Maricopa-AZ','301-45-001A','5522 E Camelback','Phoenix','AZ','85018','residential','Single Family Residence','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600',2012,2800,0.33,4,3,'Single Family Residence',585000,180000,405000,'S. Patel','5522 E Camelback',8890.15),
      ('Maricopa-AZ','301-45-002A','18 N Central','Phoenix','AZ','85004','commercial','Office','https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',1978,42000,1.2,NULL,NULL,'Commercial Office',6200000,1800000,4400000,'Central Office Group','18 N Central',48200.00),
      ('Maricopa-AZ','301-45-003A','W Bell Rd Lot 7','Surprise','AZ','85374','land','Vacant Land','https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600',NULL,NULL,4.5,NULL,NULL,'Vacant Land',145000,145000,0,'Bell Rd Investors','PO Box 900',2985.60)
    ) AS t(county_key,parcel_id,address,city,state,zip,property_type,description,image_url,year_built,living_area_sqft,lot_size_acres,bedrooms,bathrooms,use_type,assessed_value,land_value,improvement_value,owner_name,owner_mailing_address,taxes_owed)
  LOOP
    -- Skip if parcel already exists
    IF EXISTS (SELECT 1 FROM public.properties WHERE parcel_id = v_row.parcel_id) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.properties
      (county_id, parcel_id, address, city, state, zip, property_type, description, image_url,
       year_built, living_area_sqft, lot_size_acres, bedrooms, bathrooms, use_type,
       assessed_value, land_value, improvement_value, owner_name, owner_mailing_address)
    VALUES
      (CASE v_row.county_key WHEN 'Franklin-FL' THEN v_franklin WHEN 'Cook-IL' THEN v_cook WHEN 'Harris-TX' THEN v_harris ELSE v_maricopa END,
       v_row.parcel_id, v_row.address, v_row.city, v_row.state, v_row.zip,
       v_row.property_type::property_type, v_row.description, v_row.image_url,
       v_row.year_built, v_row.living_area_sqft, v_row.lot_size_acres, v_row.bedrooms, v_row.bathrooms, v_row.use_type,
       v_row.assessed_value, v_row.land_value, v_row.improvement_value, v_row.owner_name, v_row.owner_mailing_address)
    RETURNING id INTO v_new_property;

    INSERT INTO public.liens (property_id, auction_id, taxes_owed, min_bid, starting_rate, status, tax_year, redemption_period_months)
    VALUES (v_new_property, v_auction, v_row.taxes_owed, v_row.taxes_owed, 18.00, 'active', 2024, 24);
  END LOOP;
END $$;
