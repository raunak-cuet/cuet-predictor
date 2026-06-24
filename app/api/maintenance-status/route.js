// Public read-only endpoint: returns whether maintenance is on.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function noStoreHeaders() {
  return { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };
}

// Bulletproof truthiness check — accepts every shape Supabase JSONB can hand back
function isTrue(v) {
  if (v === true || v === 1)                  return true;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    return s === 'true' || s === '"true"' || s === '1' || s === 'yes' || s === 'on';
  }
  return false;
}

export async function GET() {
  const cfg = configCheck();
  if (cfg) return NextResponse.json({ enabled: false, reason: cfg }, { headers: noStoreHeaders() });

  const sb = supabaseAdmin();
  try {
    const { data, error } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ enabled: false, reason: error.message }, { headers: noStoreHeaders() });
    }

    const enabled = isTrue(data?.value);
    return NextResponse.json({ enabled, raw: data?.value ?? null }, { headers: noStoreHeaders() });
  } catch (e) {
    return NextResponse.json({ enabled: false, reason: e.message }, { headers: noStoreHeaders() });
  }
}
