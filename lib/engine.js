// =====================================================================
// MASTER ENGINE
// Given a student's scores + category, returns the ranked list of
// program admission predictions across all 1,526 DU programs.
// =====================================================================

import PROGRAMS from './programs.data.json';
import { computeComposite } from './composite.js';
import { projectCutoff, admissionProbability, percentileFromScore } from './predict.js';

// =====================================================================
// runEngine({ scores, category, subjectsTaken })
//
//   scores: { '101': 216.07, '319': 219.43, ... }
//   category: 'UR'|'OBC'|'SC'|'ST'|'EWS'|'PwBD'
//   subjectsTaken: ['101','319','309','305','501']  (optional — inferred from scores keys)
//
// Returns: Array<PredictionRow>
// =====================================================================

export function runEngine({ scores, category }) {
  const cat = (category || 'UR').toUpperCase();
  const out = [];

  for (const prog of PROGRAMS) {
    const comp = computeComposite(prog.formula, scores);
    if (!comp.eligible) continue;

    const cutoff2025 = prog.cutoff_2025?.[cat];
    if (cutoff2025 == null) continue;  // skip categories the college doesn't have data for

    const usedCodes = comp.used.map(u => u.code);
    const projection = projectCutoff(cutoff2025, prog, cat, usedCodes);

    // Determine seats in this category
    let seats = null;
    if (prog.seats && prog.seats[cat]) seats = prog.seats[cat];
    // BFIA/BMS/BBE entrance seats live under entrance map already.
    // For merit programs, leave null (engine handles gracefully).

    const probability = admissionProbability(comp.composite, projection, seats);
    const percentile  = percentileFromScore(comp.composite, comp.outOf, cat);

    out.push({
      id: prog.id,
      college: prog.college,
      program: prog.program,
      formula: prog.formula,
      yourComposite: comp.composite,
      outOf: comp.outOf,
      breakdown: comp.used,
      cutoff2025,
      projection,
      probability,
      percentile,
      seats,
      category: cat
    });
  }

  // Sort by probability DESC (nulls last)
  out.sort((a, b) => {
    const pa = a.probability.p ?? -1;
    const pb = b.probability.p ?? -1;
    return pb - pa;
  });

  return out;
}

// =====================================================================
// Build dropdown options for the UI (filtered by subjects taken)
// =====================================================================
export function eligibleProgramsForSubjects(subjectsTaken) {
  const dummy = Object.fromEntries(subjectsTaken.map(c => [c, 200]));
  const seen = new Set();
  const items = [];
  for (const p of PROGRAMS) {
    const c = computeComposite(p.formula, dummy);
    if (!c.eligible) continue;
    const key = p.id;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: p.id,
      label: `${p.college} — ${p.program}`,
      college: p.college,
      program: p.program
    });
  }
  items.sort((a, b) => a.label.localeCompare(b.label));
  return items;
}

export function allPrograms() {
  return PROGRAMS.map(p => ({
    id: p.id, college: p.college, program: p.program,
    formula: p.formula, hasSeatsData: !!p.seats
  }));
}

export function totalProgramCount() { return PROGRAMS.length; }
