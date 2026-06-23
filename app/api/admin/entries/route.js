// GET /api/admin/entries?password=...
// Returns all submissions + summary metrics for the admin dashboard.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get('password') || '';

  // ---- Password check ----
  const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
  if (password !== ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ---- Supabase config check ----
  const cfg = configCheck();
  if (cfg) {
    return NextResponse.json({ error: `Supabase not configured: ${cfg}` }, { status: 500 });
  }

  // ---- Fetch entries ----
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('[admin/entries] Fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ---- Build summary ----
  const total = data.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = data.filter(d => new Date(d.created_at) >= today).length;

  const dreamCounts = {};
  for (const d of data) {
    if (d.dream_label) dreamCounts[d.dream_label] = (dreamCounts[d.dream_label] || 0) + 1;
  }
  const popular = Object.entries(dreamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const validScores = data.map(d => d.composite_top).filter(x => typeof x === 'number');
  const avg = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length * 100) / 100
    : null;

  return NextResponse.json({
    ok: true,
    summary: { total, today: todayCount, popular, avg },
    entries: data
  });
}
