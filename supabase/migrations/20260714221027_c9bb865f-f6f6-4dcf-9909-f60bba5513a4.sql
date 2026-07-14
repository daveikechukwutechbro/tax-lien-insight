
DO $$ BEGIN
  CREATE TYPE public.fund_request_status AS ENUM ('pending','approved','rejected','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.fund_request_kind AS ENUM ('deposit','withdrawal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.fund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.fund_request_kind NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  reference text,
  notes text,
  status public.fund_request_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.fund_requests TO authenticated;
GRANT ALL ON public.fund_requests TO service_role;
ALTER TABLE public.fund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own fund requests" ON public.fund_requests;
CREATE POLICY "Users read own fund requests" ON public.fund_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users create own fund requests" ON public.fund_requests;
CREATE POLICY "Users create own fund requests" ON public.fund_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins update fund requests" ON public.fund_requests;
CREATE POLICY "Admins update fund requests" ON public.fund_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS trg_fund_requests_updated ON public.fund_requests;
CREATE TRIGGER trg_fund_requests_updated BEFORE UPDATE ON public.fund_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  query jsonb NOT NULL DEFAULT '{}'::jsonb,
  notify boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT ALL ON public.saved_searches TO service_role;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users manage own saved searches" ON public.saved_searches FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_admin boolean NOT NULL DEFAULT false,
  subject text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own messages" ON public.messages;
CREATE POLICY "Users read own messages" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Users send own messages" ON public.messages;
CREATE POLICY "Users send own messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND from_admin = false);
DROP POLICY IF EXISTS "Admins reply on any thread" ON public.messages;
CREATE POLICY "Admins reply on any thread" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND from_admin = true);
DROP POLICY IF EXISTS "Users mark own read" ON public.messages;
CREATE POLICY "Users mark own read" ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'info';
DROP POLICY IF EXISTS "Users mark own notifications" ON public.notifications;
CREATE POLICY "Users mark own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.approve_fund_request(_id uuid, _approve boolean, _admin_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_req public.fund_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_req FROM public.fund_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Already processed'; END IF;

  IF _approve THEN
    IF v_req.kind = 'deposit' THEN
      UPDATE public.profiles SET account_balance = account_balance + v_req.amount WHERE id = v_req.user_id;
    ELSE
      UPDATE public.profiles SET account_balance = account_balance - v_req.amount
        WHERE id = v_req.user_id AND account_balance >= v_req.amount;
      IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    END IF;
    UPDATE public.fund_requests SET status='completed', admin_notes=_admin_notes,
      processed_by=v_admin, processed_at=now() WHERE id = _id;
    INSERT INTO public.notifications(user_id, title, body, kind, link)
      VALUES (v_req.user_id, v_req.kind || ' approved',
              'Your ' || v_req.kind || ' of $' || v_req.amount || ' has been processed.',
              'success', '/dashboard/funds');
  ELSE
    UPDATE public.fund_requests SET status='rejected', admin_notes=_admin_notes,
      processed_by=v_admin, processed_at=now() WHERE id = _id;
    INSERT INTO public.notifications(user_id, title, body, kind, link)
      VALUES (v_req.user_id, v_req.kind || ' rejected',
              COALESCE(_admin_notes,'Your request was rejected.'),
              'warning', '/dashboard/funds');
  END IF;
END; $$;
