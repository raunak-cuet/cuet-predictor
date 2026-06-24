// ============================================================
// MAINTENANCE MIDDLEWARE — Edge-Runtime compatible (no Node modules)
//
// Behaviour:
//   • Maintenance ON (DB toggle or env var) → all visitors see /maintenance
//   • Admin has a bypass cookie set on login → sees the real site
//   • /admin and /api/admin/* always accessible
//
// Cookie scheme: HttpOnly + Secure cookie storing the admin password.
// JS can't read it (HttpOnly), HTTPS encrypts it in transit (Secure).
// Edge-Runtime safe — no Node crypto required.
// ============================================================

import { NextResponse } from 'next/server';

const BYPASS_COOKIE = 'ds_bypass';
const CACHE_TTL_MS = 10_000;

// Module-scoped in-memory cache so we don't hit the DB on every request.
// Cleared every 10s — fresh enough that admin toggle takes effect quickly.
let cachedState = { enabled: false, fetchedAt: 0 };

async function isMaintenanceOn(request) {
  // 1. Env var override (emergency switch)
  if (process.env.MAINTENANCE_MODE === 'true') return true;

  // 2. Cached state (avoids hammering Supabase)
  if (Date.now() - cachedState.fetchedAt < CACHE_TTL_MS) {
    return cachedState.enabled;
  }

  // 3. Fresh check via internal API
  try {
    const url = new URL('/api/maintenance-status', request.url);
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const j = await res.json();
      cachedState = { enabled: !!j.enabled, fetchedAt: Date.now() };
      return cachedState.enabled;
    }
  } catch {
    // Fail open — never lock people out due to a DB blip
  }
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Always allow these paths — admin can always re-enter even mid-maintenance
  const alwaysAllowed = [
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
  if (alwaysAllowed.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const on = await isMaintenanceOn(request);
  if (!on) return NextResponse.next();

  // Maintenance is ON — check for admin bypass cookie
  const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
  const cookie = request.cookies.get(BYPASS_COOKIE)?.value;
  if (cookie && cookie === ADMIN) {
    // Admin gets the live site — silent bypass
    return NextResponse.next();
  }

  // Everyone else → rewrite to /maintenance (URL stays the same)
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
