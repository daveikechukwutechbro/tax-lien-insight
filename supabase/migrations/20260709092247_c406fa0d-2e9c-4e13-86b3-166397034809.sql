-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.property_type AS ENUM ('residential', 'land', 'commercial');
CREATE TYPE public.auction_status AS ENUM ('draft', 'scheduled', 'live', 'closed', 'canceled');
CREATE TYPE public.lien_status AS ENUM ('active', 'redeemed', 'canceled', 'expired');
CREATE TYPE public.bid_status AS ENUM ('winning', 'outbid', 'won', 'lost', 'invalid');

-- =============================================================================
-- SHARED updated_at TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- PROFILES
-- =============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- USER ROLES (SEPARATE from profiles — prevents privilege escalation)
-- =============================================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_own" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- SECURITY DEFINER role check — call from RLS policies without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- COUNTIES
-- =============================================================================
CREATE TABLE public.counties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state char(2) NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state, name)
);
GRANT SELECT ON public.counties TO anon, authenticated;
GRANT ALL ON public.counties TO service_role;
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counties_public_read" ON public.counties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "counties_admin_write" ON public.counties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- PROPERTIES
-- =============================================================================
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id) ON DELETE RESTRICT,
  parcel_id text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state char(2) NOT NULL,
  zip text NOT NULL,
  property_type public.property_type NOT NULL,
  description text,
  assessed_value numeric(14,2),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, parcel_id)
);
CREATE INDEX idx_properties_county ON public.properties(county_id);
CREATE INDEX idx_properties_state ON public.properties(state);
GRANT SELECT ON public.properties TO anon, authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties_public_read" ON public.properties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "properties_admin_write" ON public.properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- AUCTIONS
-- =============================================================================
CREATE TABLE public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid REFERENCES public.counties(id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.auction_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_starts_at ON public.auctions(starts_at);
GRANT SELECT ON public.auctions TO anon, authenticated;
GRANT ALL ON public.auctions TO service_role;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auctions_public_read" ON public.auctions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "auctions_admin_write" ON public.auctions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_auctions_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Validate auction window with a trigger (CHECK constraints must be immutable)
CREATE OR REPLACE FUNCTION public.validate_auction_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ends_at <= NEW.starts_at THEN
    RAISE EXCEPTION 'Auction ends_at must be after starts_at';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auctions_validate_window
  BEFORE INSERT OR UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.validate_auction_window();

-- =============================================================================
-- LIENS
-- =============================================================================
CREATE TABLE public.liens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  auction_id uuid NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  tax_year int NOT NULL,
  taxes_owed numeric(14,2) NOT NULL CHECK (taxes_owed > 0),
  min_bid numeric(14,2) NOT NULL CHECK (min_bid > 0),
  starting_rate numeric(5,2) NOT NULL DEFAULT 18.00 CHECK (starting_rate >= 0 AND starting_rate <= 50),
  bid_decrement numeric(5,2) NOT NULL DEFAULT 0.25 CHECK (bid_decrement > 0),
  current_rate numeric(5,2),
  current_winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.lien_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, property_id, tax_year)
);
CREATE INDEX idx_liens_auction ON public.liens(auction_id);
CREATE INDEX idx_liens_property ON public.liens(property_id);
CREATE INDEX idx_liens_status ON public.liens(status);
GRANT SELECT ON public.liens TO anon, authenticated;
GRANT ALL ON public.liens TO service_role;
ALTER TABLE public.liens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liens_public_read" ON public.liens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "liens_admin_write" ON public.liens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_liens_updated_at BEFORE UPDATE ON public.liens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- BIDS
-- =============================================================================
CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lien_id uuid NOT NULL REFERENCES public.liens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_rate numeric(5,2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 50),
  status public.bid_status NOT NULL DEFAULT 'winning',
  placed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bids_lien ON public.bids(lien_id);
CREATE INDEX idx_bids_user ON public.bids(user_id);
CREATE INDEX idx_bids_lien_rate ON public.bids(lien_id, interest_rate);
GRANT SELECT ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
-- NOTE: no INSERT grant to authenticated — bids MUST go through place_bid()
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bids_select_own" ON public.bids FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bids_select_winning_public" ON public.bids FOR SELECT TO authenticated USING (status = 'winning');
CREATE POLICY "bids_admin_all" ON public.bids FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- WATCHLIST
-- =============================================================================
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);
CREATE INDEX idx_watchlist_user ON public.watchlist(user_id);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "watchlist_own" ON public.watchlist FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read_at);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- ADMIN LOGS
-- =============================================================================
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_actor ON public.admin_logs(actor_user_id);
CREATE INDEX idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
GRANT SELECT ON public.admin_logs TO authenticated;
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_logs_admin_read" ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- place_bid — atomic, race-safe interest-rate bid-down
-- =============================================================================
CREATE OR REPLACE FUNCTION public.place_bid(
  _lien_id uuid,
  _interest_rate numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_lien public.liens%ROWTYPE;
  v_auction public.auctions%ROWTYPE;
  v_new_bid_id uuid;
  v_max_allowed numeric(5,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Lock the lien row to serialize concurrent bids on the same lien
  SELECT * INTO v_lien FROM public.liens WHERE id = _lien_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lien not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_lien.status <> 'active' THEN
    RAISE EXCEPTION 'Lien is not active (status=%)', v_lien.status USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = v_lien.auction_id;
  IF v_auction.status <> 'live' THEN
    RAISE EXCEPTION 'Auction is not live (status=%)', v_auction.status USING ERRCODE = '22023';
  END IF;
  IF now() < v_auction.starts_at OR now() >= v_auction.ends_at THEN
    RAISE EXCEPTION 'Auction is outside its bidding window' USING ERRCODE = '22023';
  END IF;

  IF _interest_rate < 0 OR _interest_rate > v_lien.starting_rate THEN
    RAISE EXCEPTION 'Bid rate must be between 0 and %', v_lien.starting_rate USING ERRCODE = '22023';
  END IF;

  -- Bid-down: new rate must be at least one decrement below current winner
  IF v_lien.current_rate IS NOT NULL THEN
    v_max_allowed := v_lien.current_rate - v_lien.bid_decrement;
    IF _interest_rate > v_max_allowed THEN
      RAISE EXCEPTION 'Bid rate must be % or lower', v_max_allowed USING ERRCODE = '22023';
    END IF;
    IF v_lien.current_winner_id = v_user_id THEN
      RAISE EXCEPTION 'You are already the winning bidder' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF _interest_rate > v_lien.starting_rate THEN
      RAISE EXCEPTION 'Opening bid must be % or lower', v_lien.starting_rate USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Mark existing winning bid on this lien as outbid
  UPDATE public.bids
    SET status = 'outbid'
    WHERE lien_id = _lien_id AND status = 'winning';

  -- Insert new winning bid
  INSERT INTO public.bids (lien_id, user_id, interest_rate, status)
  VALUES (_lien_id, v_user_id, _interest_rate, 'winning')
  RETURNING id INTO v_new_bid_id;

  -- Denormalize current winning rate/winner on the lien
  UPDATE public.liens
    SET current_rate = _interest_rate,
        current_winner_id = v_user_id
    WHERE id = _lien_id;

  RETURN v_new_bid_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_bid(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated;

-- =============================================================================
-- SEED DATA — mirrors the homepage mock
-- =============================================================================
INSERT INTO public.counties (state, name) VALUES
  ('FL', 'Franklin'),
  ('IL', 'Cook'),
  ('TX', 'Harris');

WITH
  franklin AS (SELECT id FROM public.counties WHERE state='FL' AND name='Franklin'),
  seeded_auction AS (
    INSERT INTO public.auctions (county_id, title, starts_at, ends_at, status)
    SELECT id, 'Franklin County, FL — Aug 2026 Tax Lien Auction',
           now() + interval '5 days', now() + interval '5 days 8 hours', 'scheduled'
    FROM franklin
    RETURNING id, county_id
  ),
  seeded_props AS (
    INSERT INTO public.properties (county_id, parcel_id, address, city, state, zip, property_type, description, image_url)
    SELECT
      county_id, parcel_id, address, 'Anytown', 'FL', zip, ptype, descr, img
    FROM seeded_auction,
      (VALUES
        ('22-05-17-1234-0000-0010', '123 Oak Street',      '32101', 'residential'::public.property_type, 'Single Family Residence', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=240&q=60'),
        ('22-05-17-1234-0000-0020', '456 Maple Avenue',    '32102', 'residential'::public.property_type, 'Single Family Residence', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=240&q=60'),
        ('22-05-17-1234-0000-0030', '789 Pine Road',       '32103', 'land'::public.property_type,        'Vacant Land',             'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=240&q=60'),
        ('22-05-17-1234-0000-0040', '321 Cedar Lane',      '32104', 'residential'::public.property_type, 'Single Family Residence', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=240&q=60'),
        ('22-05-17-1234-0000-0050', '654 Birch Boulevard', '32105', 'residential'::public.property_type, 'Single Family Residence', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=240&q=60')
      ) AS v(parcel_id, address, zip, ptype, descr, img)
    RETURNING id, parcel_id
  )
INSERT INTO public.liens (property_id, auction_id, tax_year, taxes_owed, min_bid, starting_rate, bid_decrement, status)
SELECT p.id, a.id, 2025, amt, amt, 15.00, 0.25, 'active'
FROM seeded_props p
JOIN seeded_auction a ON true
JOIN (VALUES
  ('22-05-17-1234-0000-0010', 5642.18),
  ('22-05-17-1234-0000-0020', 3210.75),
  ('22-05-17-1234-0000-0030', 8987.64),
  ('22-05-17-1234-0000-0040', 2150.00),
  ('22-05-17-1234-0000-0050', 4875.90)
) AS v(parcel_id, amt) ON v.parcel_id = p.parcel_id;
