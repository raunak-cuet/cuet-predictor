// Admin maintenance mode toggle
// GET  /api/admin/maintenance?password=...   → returns current state + sets bypass cookie
// POST /api/admin/maintenance                → body { password, enabled } + refreshes cookie
//
// The bypass cookie value IS the admin password. It's HttpOnly + Secure
// so it can't be stolen by JS or read in plaintext over the wire.
// This keeps the middleware Edge-Runtime compatible (no Node crypto).

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const SETTING_KEY = 'maintenance_mode';
const BYPASS_COOKIE = 'ds_bypass';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;   // 30 days

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
}

function setBypassCookie(res) {
  res.cookies.set({
    name: BYPASS_COOKIE,
    value: getAdminPassword(),
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });
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
    .upsert(
      { key: SETTING_KEY, value: enabled, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  if (error) throw error;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get('password') || '';
  const ADMIN = getAdminPassword();
  if (password !== ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cfg = configCheck();
  if (cfg) return NextResponse.json({ error: cfg }, { status: 500 });

  const sb = supabaseAdmin();
  try {
    const enabled = await readState(sb);
    const res = NextResponse.json({ ok: true, enabled }, {
      headers: { 'Cache-Control': 'no-store' }
    });
    setBypassCookie(res);
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
  const ADMIN = getAdminPassword();
  if (password !== ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be boolean' }, { status: 400 });
  }

  const cfg = configCheck();
  if (cfg) return NextResponse.json({ error: cfg }, { status: 500 });

  const sb = supabaseAdmin();
  try {
    await writeState(sb, enabled);
    const res = NextResponse.json({ ok: true, enabled });
    setBypassCookie(res);
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
