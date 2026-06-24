// ============================================================
// MAINTENANCE MIDDLEWARE
// Maintenance can be turned on EITHER by:
//   (a) Setting env var MAINTENANCE_MODE=true in Vercel (emergency)
//   (b) Flipping the toggle in /admin (preferred — instant, no redeploy)
//
// The admin toggle stores its state in Supabase. To avoid every request
// hitting Supabase, we use a tiny client-fetched check via cookie that
// the maintenance API sets. But since middleware runs on the edge and
// can't easily query Supabase, we use the env var as the primary switch
// AND let the admin toggle write to env vars via Vercel API... too complex.
//
// SIMPLEST RELIABLE APPROACH: cookie-based.
// When admin toggles maintenance on, the API sets a cookie that the
// middleware reads. Since cookies are set per-browser, this would only
// affect the admin. So instead, we use a global pattern:
// the middleware does a fast fetch to /api/maintenance-status which is
// cached at the edge for 10 seconds.
// ============================================================

import { NextResponse } from 'next/server';

// Cache the maintenance-state check in-memory at the edge for 10 seconds
// to avoid hitting Supabase on every request.
let cachedState = { enabled: false, fetchedAt: 0 };
const CACHE_TTL_MS = 10_000;

async function isMaintenanceOn(request) {
  // 1. Env var override (fastest, used in true emergencies)
  if (process.env.MAINTENANCE_MODE === 'true') return true;

  // 2. Cached DB state
  if (Date.now() - cachedState.fetchedAt < CACHE_TTL_MS) {
    return cachedState.enabled;
  }

  // 3. Fresh check
  try {
    const url = new URL('/api/maintenance-status', request.url);
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      cachedState = { enabled: !!j.enabled, fetchedAt: Date.now() };
      return cachedState.enabled;
    }
  } catch {}
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow these paths — even during maintenance
  const allowed = [
    '/maintenance',
    '/admin',
    '/api/admin',
    '/api/maintenance-status',
    '/_next',
    '/favicon',
    '/apple-touch-icon',
    '/dreamseat-wordmark',
    '/stars-icon'
  ];
  if (allowed.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const on = await isMaintenanceOn(request);
  if (!on) return NextResponse.next();

  // Rewrite to /maintenance (URL stays the same to the user)
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
