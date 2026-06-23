// POST /api/admin/delete
// Body: { password, ids?: string[], all?: boolean }
// Deletes one, many, or every submission row.
// Returns { ok: true, deleted: <count> }

import { NextResponse } from 'next/server';
import { supabaseService, supabaseAnon } from '@/lib/supabase';

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

  // Prefer service-role (bypasses RLS). Fall back to anon (works with the
  // permissive delete RLS policy added in schema.sql).
  let sb = supabaseService();
  let usedKey = 'service_role';
  if (!sb) {
    sb = supabaseAnon();
    usedKey = 'anon';
  }
  if (!sb) {
    return NextResponse.json({
      error: 'Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in env vars.'
    }, { status: 500 });
  }

  try {
    if (all === true) {
      // Delete every submission — use a filter that matches all rows.
      const { error, count } = await sb
        .from('submissions')
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error(`[/api/admin/delete ALL] (${usedKey})`, error);
        return NextResponse.json({
          error: `Supabase: ${error.message}`,
          hint: error.hint,
          details: error.details,
          keyUsed: usedKey
        }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: count ?? 'all', keyUsed: usedKey });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
    }

    const { error, count } = await sb
      .from('submissions')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (error) {
      console.error(`[/api/admin/delete ids] (${usedKey})`, error);
      return NextResponse.json({
        error: `Supabase: ${error.message}`,
        hint: error.hint,
        details: error.details,
        keyUsed: usedKey
      }, { status: 500 });
    }
    return NextResponse.json({ ok: true, deleted: count ?? ids.length, keyUsed: usedKey });
  } catch (e) {
    console.error(`[/api/admin/delete EXCEPTION] (${usedKey})`, e);
    return NextResponse.json({
      error: e.message || 'Delete failed',
      keyUsed: usedKey
    }, { status: 500 });
  }
}
