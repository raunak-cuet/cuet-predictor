// Supabase client factory.
// We only use ONE client — the secret-key one — and only on the server.
// The browser never gets any Supabase client because all DB operations
// flow through our /api/* routes, which themselves use the secret key.

import { createClient } from '@supabase/supabase-js';

const URL    = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Returns a Supabase client with FULL database privileges.
 * Only call this from server-side code (API routes).
 * Returns null if env vars are missing — caller must handle.
 */
export function supabaseAdmin() {
  if (!URL || !SECRET) return null;
  return createClient(URL, SECRET, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/** Returns a friendly message if Supabase isn't configured */
export function configCheck() {
  if (!URL)    return 'NEXT_PUBLIC_SUPABASE_URL is not set';
  if (!SECRET) return 'SUPABASE_SERVICE_ROLE_KEY is not set';
  return null;
}
