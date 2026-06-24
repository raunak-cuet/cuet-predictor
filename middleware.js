// ============================================================
// MAINTENANCE MIDDLEWARE
// When MAINTENANCE_MODE=true is set in Vercel env vars, every
// request to the site is rewritten to /maintenance instead.
//
// To enable:  set MAINTENANCE_MODE=true   in Vercel → Settings → Env Vars → Redeploy
// To disable: set MAINTENANCE_MODE=false  (or delete the variable) → Redeploy
//
// Exemptions (always accessible even during maintenance):
//   • /admin           — so you can still see submissions
//   • /api/admin/*     — admin API routes
//   • /maintenance     — the maintenance page itself
//   • Static assets    — favicons, images, fonts
// ============================================================

import { NextResponse } from 'next/server';

export function middleware(request) {
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
  if (!isMaintenance) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Always allow these paths
  const allowed = [
    '/maintenance',
    '/admin',
    '/api/admin',
    '/_next',
    '/favicon',
    '/apple-touch-icon',
    '/dreamseat-wordmark',
    '/stars-icon'
  ];
  if (allowed.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Everything else → rewrite to /maintenance
  // Using rewrite (not redirect) so the URL stays the same to the user.
  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Run middleware on all routes except Next.js internals & static files
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
};
