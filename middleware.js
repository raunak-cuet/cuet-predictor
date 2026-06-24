// ============================================================
// MAINTENANCE MIDDLEWARE — with admin cookie-bypass
//
// Behaviour:
//   • If the request has a valid `ds_bypass` cookie (set when admin
//     logs in / toggles maintenance), they ALWAYS see the live site
//     even when maintenance is on.
//   • Otherwise, if maintenance is enabled (DB toggle OR env var),
//     the request is rewritten to /maintenance.
//   • /admin and /api/admin/* always work — even without bypass —
//     so the admin can always re-enter the dashboard if needed.
//
// Maintenance can be enabled by:
//   (a) Toggling in /admin (preferred — instant, no redeploy)
//   (b) Setting MAINTENANCE_MODE=true in Vercel (emergency override)
// ============================================================

import { NextResponse } from 'next/server';
import crypto from 'crypto';

const BYPASS_COOKIE = 'ds_bypass';
const CACHE_TTL_MS = 10_000;
let cachedState = { enabled: false, fetchedAt: 0 };

function expectedBypassToken() {
  const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
  return crypto.createHmac('sha256', ADMIN).update('dreamseat-admin-bypass').digest('hex').slice(0, 32);
}

async function isMaintenanceOn(request) {
  if (process.env.MAINTENANCE_MODE === 'true') return true;
  if (Date.now() - cachedState.fetchedAt < CACHE_TTL_MS) return cachedState.enabled;
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

  // Always allow these paths regardless of maintenance state
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
  const cookie = request.cookies.get(BYPASS_COOKIE)?.value;
  if (cookie && cookie === expectedBypassToken()) {
    return NextResponse.next();   // admin bypasses maintenance silently
  }

  // Regular user — rewrite to /maintenance
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
