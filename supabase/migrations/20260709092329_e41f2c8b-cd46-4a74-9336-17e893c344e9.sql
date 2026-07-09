-- Lock down internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.place_bid(uuid, numeric) FROM PUBLIC, anon;
-- has_role must remain callable from RLS (auth.uid() context) — keep authenticated EXECUTE
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(uuid, numeric) TO authenticated;