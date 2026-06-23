// POST /api/submit
// Saves the student's entry to Supabase and returns the engine results.
// Even if Supabase save fails we ALWAYS return results to the user.

import { NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase';
import { runEngine } from '@/lib/engine';
import crypto from 'crypto';

export const runtime = 'nodejs';

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
  for (const [code, val] of Object.entries(scores)) {
    if (typeof val !== 'number' || val < 0 || val > 250) {
      return NextResponse.json({ error: `Invalid score for ${code}: ${val}` }, { status: 400 });
    }
  }

  // ---- Run the engine ----
  let results = [];
  try {
    results = runEngine({ scores, category });
  } catch (e) {
    console.error('Engine error', e);
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
  const sb = supabaseAnon();
  let submissionId = null;
  if (sb) {
    try {
      const { data, error } = await sb.from('submissions').insert({
        name: (name && String(name).trim()) || null,
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
      if (error) console.error('Supabase insert error:', error.message);
      else submissionId = data.id;
    } catch (e) {
      console.error('Supabase failed (continuing):', e.message);
    }
  } else {
    console.warn('Supabase not configured — running in offline mode.');
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    persisted: !!submissionId,
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
