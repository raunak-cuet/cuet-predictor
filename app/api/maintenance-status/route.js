// Admin maintenance mode toggle
// GET  /api/admin/maintenance?password=...        → returns current state
// POST /api/admin/maintenance                     → body { password, enabled: boolean }
//
// Uses a Supabase tiny `settings` table for state. This way it survives
// across serverless function instances without needing a separate KV store.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
const SETTING_KEY = 'maintenance_mode';

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
    .upsert({ key: SETTING_KEY, value: enabled }, { onConflict: 'key' });
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
    return NextResponse.json({ ok: true, enabled }, {
      headers: { 'Cache-Control': 'no-store' }
    });
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
    return NextResponse.json({ ok: true, enabled });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
