// Public read-only endpoint: returns whether maintenance is on.
// Used by the maintenance page to auto-refresh once the site is back.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const cfg = configCheck();
  if (cfg) return NextResponse.json({ enabled: false });
  const sb = supabaseAdmin();
  try {
    const { data } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    const enabled = data?.value === true || data?.value === 'true';
    return NextResponse.json({ enabled }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
