// POST /api/submit
// Validates input → runs the prediction engine → saves to Supabase → returns results.

import { NextResponse } from 'next/server';
import { supabaseAdmin, configCheck } from '@/lib/supabase';
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
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const {
    name = null,
    category = 'UR',
    scores = {},
    subjectsTaken = [],
    dreamProgramId = null,
    dreamLabel = null
  } = body || {};

  // ---- Validate input ----
  if (!name || String(name).trim().length < 2) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!['UR','OBC','SC','ST','EWS','PwBD'].includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!Array.isArray(subjectsTaken) || subjectsTaken.length === 0) {
    return NextResponse.json({ error: 'No subjects selected' }, { status: 400 });
  }
  for (const [code, val] of Object.entries(scores)) {
    if (typeof val !== 'number' || val < 0 || val > 250) {
      return NextResponse.json({ error: `Invalid score for subject ${code}` }, { status: 400 });
    }
  }

  // ---- Run prediction engine ----
  let results;
  try { results = runEngine({ scores, category }); }
  catch (e) {
    console.error('[submit] Engine error:', e);
    return NextResponse.json({ error: 'Prediction engine failed' }, { status: 500 });
  }

  // ---- Build summary ----
  const compositeTop = results.length ? results[0].yourComposite : null;
  let dreamProb = null;
  if (dreamProgramId != null) {
    const hit = results.find(r => r.id === Number(dreamProgramId));
    if (hit) dreamProb = hit.probability.p;
  }

  // ---- Save to Supabase ----
  const cfg = configCheck();
  let submissionId = null;
  let saveStatus = 'skipped';

  if (cfg) {
    console.warn('[submit] Supabase not configured:', cfg);
    saveStatus = `not configured: ${cfg}`;
  } else {
    const sb = supabaseAdmin();
    try {
      const { data, error } = await sb
        .from('submissions')
        .insert({
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
        })
        .select('id')
        .single();

      if (error) {
        console.error('[submit] Supabase insert error:', error);
        saveStatus = `error: ${error.message}`;
      } else {
        submissionId = data.id;
        saveStatus = 'saved';
      }
    } catch (e) {
      console.error('[submit] Supabase exception:', e);
      saveStatus = `exception: ${e.message}`;
    }
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    saved: !!submissionId,
    saveStatus,
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
