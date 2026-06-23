// POST /api/admin/delete
// Body: { password, id?: string, all?: boolean }
// Deletes a single submission by id, or every submission if all=true.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { password, id = null, all = false } = body || {};

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

  const sb = supabaseAdmin();

  try {
    // DELETE ALL
    if (all === true) {
      // First count, then delete, then recount → guarantees we know what happened
      const { count: beforeCount } = await sb
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      // Use a filter that's always true: id IS NOT NULL (matches every row, since id is PK)
      const { error } = await sb
        .from('submissions')
        .delete()
        .not('id', 'is', null);

      if (error) {
        console.error('[delete ALL] Supabase error:', error);
        return NextResponse.json({
          error: error.message,
          details: error.details,
          hint: error.hint
        }, { status: 500 });
      }

      const { count: afterCount } = await sb
        .from('submissions')
        .select('*', { count: 'exact', head: true });

      const deleted = (beforeCount ?? 0) - (afterCount ?? 0);
      return NextResponse.json({
        ok: true,
        deleted,
        beforeCount: beforeCount ?? 0,
        afterCount: afterCount ?? 0
      });
    }

    // DELETE ONE
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Provide id (uuid string) to delete one row' }, { status: 400 });
    }

    // Verify it exists first → gives a clear error if not
    const { data: existing, error: fetchError } = await sb
      .from('submissions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('[delete ONE] Fetch check error:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({
        error: 'Row not found',
        searchedId: id
      }, { status: 404 });
    }

    // Delete it
    const { error: delError } = await sb
      .from('submissions')
      .delete()
      .eq('id', id);

    if (delError) {
      console.error('[delete ONE] Supabase error:', delError);
      return NextResponse.json({
        error: delError.message,
        details: delError.details,
        hint: delError.hint
      }, { status: 500 });
    }

    // Verify it's actually gone
    const { data: stillThere } = await sb
      .from('submissions')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (stillThere) {
      return NextResponse.json({
        error: 'Delete succeeded but row still present — RLS may be blocking',
        searchedId: id
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: 1, id });
  } catch (e) {
    console.error('[delete] Exception:', e);
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 });
  }
}
