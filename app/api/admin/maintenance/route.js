// Admin maintenance mode toggle
// GET  /api/admin/maintenance?password=...   → returns current state
// POST /api/admin/maintenance                → body { password, enabled }
//
// When the admin enables maintenance, this route also writes a signed
// "bypass cookie" on the admin's browser so they can keep viewing the
// real site while everyone else sees the maintenance page.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
const SETTING_KEY = 'maintenance_mode';
const BYPASS_COOKIE = 'ds_bypass';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;   // 30 days

// HMAC-signed token derived from the admin password — only the server can
// generate it, so a user can't fake the cookie without the password.
export function bypassToken() {
  return crypto.createHmac('sha256', ADMIN).update('dreamseat-admin-bypass').digest('hex').slice(0, 32);
}

async function readState(sb) {
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', SETTING_KEY)
    .maybeSingle();
  if (error) throw error;
  return data?.value === true || data?.value === 'true';
}

async function writeState(sb, enabled) {
  const { error } = await sb
    .from('settings')
    .upsert({ key: SETTING_KEY, value: enabled, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get('password') || '';
  if (password !== ADMIN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cfg = configCheck();
  if (cfg) return NextResponse.json({ error: cfg }, { status: 500 });

  const sb = supabaseAdmin();
  try {
    const enabled = await readState(sb);

    // Always (re)set the bypass cookie on a successful auth GET — keeps
    // the admin's bypass alive across sessions.
    const res = NextResponse.json({ ok: true, enabled }, {
      headers: { 'Cache-Control': 'no-store' }
    });
    res.cookies.set({
      name: BYPASS_COOKIE,
      value: bypassToken(),
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { password, enabled } = body || {};
  if (password !== ADMIN) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });

  const cfg = configCheck();
  if (cfg) return NextResponse.json({ error: cfg }, { status: 500 });

  const sb = supabaseAdmin();
  try {
    await writeState(sb, enabled);
    const res = NextResponse.json({ ok: true, enabled });
    // Refresh the bypass cookie so the admin is never locked out
    res.cookies.set({
      name: BYPASS_COOKIE,
      value: bypassToken(),
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: COOKIE_MAX_AGE
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
