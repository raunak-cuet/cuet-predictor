// POST /api/admin/delete
// Body: { password, ids?: string[], all?: boolean }
// Deletes one, many, or every submission row.
// Returns { ok: true, deleted: <count> }

import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { password, ids = [], all = false } = body || {};

  const ADMIN = process.env.ADMIN_PASSWORD || 'CUET_ADMIN@#$118';
  if (password !== ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseService();
  if (!sb) {
    return NextResponse.json({
      error: 'Supabase service-role key not configured (SUPABASE_SERVICE_ROLE_KEY).'
    }, { status: 500 });
  }

  try {
    if (all === true) {
      // Delete every submission — use a filter that matches all rows.
      const { error, count } = await sb
        .from('submissions')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return NextResponse.json({ ok: true, deleted: count ?? 'all' });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
    }

    const { error, count } = await sb
      .from('submissions')
      .delete({ count: 'exact' })
      .in('id', ids);
    if (error) throw error;
    return NextResponse.json({ ok: true, deleted: count ?? ids.length });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
