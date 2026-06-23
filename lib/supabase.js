// Supabase client factories.
// We construct a fresh client per request to keep cold-start serverless usage clean.

import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Public (anon) — used for inserts via the API route.
export function supabaseAnon() {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

// Service-role — used by the admin endpoints only (server-side, never to browser).
export function supabaseService() {
  if (!URL || !SVC) return null;
  return createClient(URL, SVC, { auth: { persistSession: false } });
}

export function supabaseConfigured() {
  return !!(URL && (ANON || SVC));
}
