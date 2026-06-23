// POST /api/submit
// Saves the student's entry to Supabase and returns the engine results.
// Uses the SERVICE-ROLE key (server-side only) for guaranteed writes.
// Even if Supabase save fails we ALWAYS return results to the user.

import { NextResponse } from 'next/server';
import { supabaseService, supabaseAnon } from '@/lib/supabase';
import { runEngine } from '@/lib/engine';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ipHash(req) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    name = null,
    category = 'UR',
    scores = {},
    subjectsTaken = [],
    dreamProgramId = null,
    dreamLabel = null
  } = body || {};

  // ---- Validate ----
  if (!['UR','OBC','SC','ST','EWS','PwBD'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!name || String(name).trim().length < 2) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  for (const [code, val] of Object.entries(scores)) {
    if (typeof val !== 'number' || val < 0 || val > 250) {
      return NextResponse.json({ error: `Invalid score for ${code}: ${val}` }, { status: 400 });
    }
  }
  if (!Array.isArray(subjectsTaken) || subjectsTaken.length === 0) {
    return NextResponse.json({ error: 'No subjects selected' }, { status: 400 });
  }

  // ---- Run the engine ----
  let results = [];
  try {
    results = runEngine({ scores, category });
  } catch (e) {
    console.error('Engine error:', e);
    return NextResponse.json({ error: 'Engine failure' }, { status: 500 });
  }

  // ---- Build summary metrics for persistence ----
  const compositeTop = results.length ? results[0].yourComposite : null;
  let dreamProb = null;
  if (dreamProgramId != null) {
    const hit = results.find(r => r.id === Number(dreamProgramId));
    if (hit) dreamProb = hit.probability.p;
  }

  // ---- Persist to Supabase (best-effort) ----
  // Prefer service-role (server-side only, bypasses RLS).
  // Fall back to anon (works if RLS policies were created).
  let sb = supabaseService();
  let usedKey = 'service_role';
  if (!sb) {
    sb = supabaseAnon();
    usedKey = 'anon';
  }

  let submissionId = null;
  let saveError = null;
  if (sb) {
    try {
      const { data, error } = await sb.from('submissions').insert({
        name: String(name).trim(),
        category,
        scores,
        subjects_taken: subjectsTaken,
        dream_program_id: dreamProgramId ? Number(dreamProgramId) : null,
        dream_label: dreamLabel,
        composite_top: compositeTop,
        dream_probability: dreamProb,
        user_agent: req.headers.get('user-agent') || null,
        ip_hash: ipHash(req)
      }).select('id').single();

      if (error) {
        console.error(`[/api/submit] Supabase insert error using ${usedKey} key:`, error.message, error.details, error.hint);
        saveError = error.message;
      } else {
        submissionId = data.id;
        console.log(`[/api/submit] Saved submission ${submissionId} via ${usedKey}`);
      }
    } catch (e) {
      console.error('[/api/submit] Supabase exception:', e.message);
      saveError = e.message;
    }
  } else {
    console.warn('[/api/submit] Supabase NOT configured — neither service role nor anon key present.');
    saveError = 'Supabase not configured on server';
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    persisted: !!submissionId,
    saveError,                 // surface for debugging in the network tab
    keyUsed: usedKey,
    results,
    meta: {
      totalEligible: results.length,
      category,
      compositeTop,
      dreamProgramId,
      dreamProbability: dreamProb
    }
  });
}
