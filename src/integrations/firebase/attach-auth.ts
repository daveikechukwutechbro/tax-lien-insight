import { createMiddleware } from '@tanstack/react-start';
import { supabase } from './client';

// Attaches the current session bearer token to serverFn RPC calls. Registered
// as a global `functionMiddleware` in src/start.ts. With Firebase auth the
// access_token is the Firebase ID token issued by `firebaseAuth.getSession()`.
export const attachAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
