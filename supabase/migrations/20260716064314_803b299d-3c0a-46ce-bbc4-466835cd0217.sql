
CREATE TYPE public.kyc_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  date_of_birth date NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  tax_id_last4 text NOT NULL,
  id_document_path text,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own kyc" ON public.kyc_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users can insert own kyc" ON public.kyc_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update kyc" ON public.kyc_submissions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER kyc_set_updated_at BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.review_kyc(_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub public.kyc_submissions%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_sub FROM public.kyc_submissions WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.kyc_submissions
    SET status = CASE WHEN _approve THEN 'approved'::kyc_status ELSE 'rejected'::kyc_status END,
        admin_notes = _notes, reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = _id;
  IF _approve THEN
    UPDATE public.profiles SET verified = true, updated_at = now() WHERE id = v_sub.user_id;
  END IF;
  INSERT INTO public.notifications(user_id, title, body, kind, link)
    VALUES (v_sub.user_id,
      CASE WHEN _approve THEN 'Identity verified' ELSE 'Verification rejected' END,
      COALESCE(_notes, CASE WHEN _approve THEN 'Your identity has been verified. You can now bid.' ELSE 'Your KYC submission was rejected.' END),
      CASE WHEN _approve THEN 'success' ELSE 'warning' END,
      '/dashboard/verify');
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id, meta)
    VALUES (auth.uid(), CASE WHEN _approve THEN 'kyc_approve' ELSE 'kyc_reject' END, 'kyc_submissions', _id::text, jsonb_build_object('user_id', v_sub.user_id));
END $$;
