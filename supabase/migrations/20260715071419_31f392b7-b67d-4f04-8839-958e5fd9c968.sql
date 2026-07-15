
-- Admin read policies (idempotent)
DO $$ BEGIN
  -- profiles: admin read all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins read all profiles') THEN
    CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' AND policyname='Admins read all roles') THEN
    CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bids' AND policyname='Admins read all bids') THEN
    CREATE POLICY "Admins read all bids" ON public.bids FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='auction_registrations' AND policyname='Admins read all registrations') THEN
    CREATE POLICY "Admins read all registrations" ON public.auction_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Admins read all messages') THEN
    CREATE POLICY "Admins read all messages" ON public.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_logs' AND policyname='Admins read audit') THEN
    CREATE POLICY "Admins read audit" ON public.admin_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='liens' AND policyname='Admins write liens') THEN
    CREATE POLICY "Admins write liens" ON public.liens FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documents' AND policyname='Admins write documents') THEN
    CREATE POLICY "Admins write documents" ON public.documents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role public.app_role, _grant boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id=_user_id AND role=_role;
  END IF;
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id, meta)
    VALUES (auth.uid(), CASE WHEN _grant THEN 'grant_role' ELSE 'revoke_role' END, 'user_roles', _user_id::text, jsonb_build_object('role',_role));
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_verified(_user_id uuid, _verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.profiles SET verified=_verified, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id, meta)
    VALUES (auth.uid(), 'set_verified', 'profiles', _user_id::text, jsonb_build_object('verified',_verified));
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _delta numeric, _reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.profiles SET account_balance = account_balance + _delta, updated_at=now()
    WHERE id=_user_id RETURNING account_balance INTO new_bal;
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id, meta)
    VALUES (auth.uid(), 'adjust_balance', 'profiles', _user_id::text, jsonb_build_object('delta',_delta,'reason',_reason,'new_balance',new_bal));
  RETURN new_bal;
END $$;

CREATE OR REPLACE FUNCTION public.admin_send_message(_user_id uuid, _subject text, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE mid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  INSERT INTO public.messages(user_id, subject, body, from_admin) VALUES (_user_id, _subject, _body, true) RETURNING id INTO mid;
  INSERT INTO public.notifications(user_id, kind, title, body, link)
    VALUES (_user_id, 'message', COALESCE(_subject,'New message from support'), left(_body,240), '/dashboard/messages');
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id, meta)
    VALUES (auth.uid(), 'send_message', 'messages', mid::text, jsonb_build_object('to',_user_id,'subject',_subject));
  RETURN mid;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_registration(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  DELETE FROM public.auction_registrations WHERE id=_id;
  INSERT INTO public.admin_logs(actor_user_id, action, target_table, target_id)
    VALUES (auth.uid(), 'delete_registration', 'auction_registrations', _id::text);
END $$;

GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_verified(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_message(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_registration(uuid) TO authenticated;
