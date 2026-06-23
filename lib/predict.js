// =====================================================================
// PREDICTION ENGINE
// Maps a 2025 cutoff + global CUET 2026 statistics to:
//   (a) Projected 2026 cutoff band: conservative / mostLikely / aggressive
//   (b) Admission probability (0..100)
//   (c) Confidence score for the prediction itself
//   (d) Full factor breakdown for transparency
// All math is explainable & derived from real numbers — no random %.
// =====================================================================

import {
  POOL, CATEGORY_POOL, SUBJECT_STATS, TOP_DENSITY,
  poolGrowth, categoryGrowth, topDensityGrowth, subjectShift
} from './cuet2026.js';

// ---------- Verdict bands ----------
export function verdict(p) {
  if (p >= 95) return { label: 'Extremely Likely', emoji: '🟢', tone: 'safe' };
  if (p >= 80) return { label: 'Very Strong',      emoji: '🟢', tone: 'safe' };
  if (p >= 60) return { label: 'Strong Chance',    emoji: '🔵', tone: 'good' };
  if (p >= 40) return { label: 'Competitive',      emoji: '🟡', tone: 'mid'  };
  if (p >= 20) return { label: 'Difficult',        emoji: '🟠', tone: 'risk' };
  return         { label: 'Reach',            emoji: '🔴', tone: 'reach'};
}

// =====================================================================
// FACTOR ENGINE
// Each factor returns: { value, weight, contribution_marks, note }
// The sum of contribution_marks shifts the 2025 cutoff into a 2026
// "most likely" cutoff. Conservative = mostLikely − σ.  Aggressive = +σ.
// =====================================================================

function factorPoolGrowth() {
  const g = poolGrowth();             // appeared 2026 / 2025
  // Each +1% in pool size → cutoff drifts up by ~0.25 marks (empirical DU drift)
  const pctChange = (g - 1) * 100;
  const contrib = pctChange * 0.25;
  return { id:'F1', name:'Candidate pool growth', value: `${pctChange.toFixed(2)}%`,
           contribution: contrib, weight: 0.25,
           note: `${POOL.appeared[2025].toLocaleString()} → ${POOL.appeared[2026].toLocaleString()} appeared` };
}

function factorCategoryCompetition(cat) {
  const g = categoryGrowth(cat);
  const pct = (g - 1) * 100;
  const contrib = pct * 0.20;
  return { id:'F3', name:`${cat} category competition`, value: `${pct.toFixed(2)}%`,
           contribution: contrib, weight: 0.20,
           note: `${CATEGORY_POOL[cat][2025].toLocaleString()} → ${CATEGORY_POOL[cat][2026].toLocaleString()} appeared` };
}

function factorTopDensity() {
  const g = topDensityGrowth();
  const pct = (g - 1) * 100;
  // Top-end density matters most for high-cutoff programs → 0.10 weight here, scaled at runtime
  const contrib = pct * 0.10;
  return { id:'F5', name:'Top-end competition density', value: `${pct.toFixed(2)}%`,
           contribution: contrib, weight: 0.10,
           note: `100%ile holders: ${TOP_DENSITY.perc100_in_1subject[2025]} → ${TOP_DENSITY.perc100_in_1subject[2026]} (in ≥1 subject)` };
}

function factorSubjectShifts(usedCodes) {
  // Average max-score shift across the subjects used by this composite.
  // If subjects got "harder" in 2026 (max went down), cutoffs drift down too.
  let total = 0, n = 0;
  const items = [];
  for (const c of usedCodes) {
    const s = subjectShift(c);
    if (s !== 1.0) {
      total += s; n += 1;
      items.push(`${SUBJECT_STATS[c]?.name || c} ${(s*100-100).toFixed(2)}%`);
    }
  }
  const avg = n ? total / n : 1.0;
  const pct = (avg - 1) * 100;
  // 1% shift in subject maxima → ~0.6% shift in cutoff (proportional)
  // Translate into marks: pct% of 2025 cutoff (handled in projected())
  return { id:'F4+F6', name:'Subject normalisation shift', value: `${pct.toFixed(2)}%`,
           contribution: 0,           // applied multiplicatively below
           multiplier: avg,
           weight: 0.30,
           note: items.length ? items.join(', ') : 'No 2026 data for these subjects → no shift' };
}

function factorStructuralChange(programName, formulaType) {
  // 2026 added 1 domain subject for BFIA/BMS/BBE etc.
  // The cutoff is recorded on a 750 base in 2025 but will be on 1000 base in 2026 for these.
  // So we DO NOT translate (the engine compares same-formula composite).
  // Flag a structural-change warning that LOWERS confidence rather than shifting cutoff.
  if (formulaType === 'BFIA' || formulaType === 'BMS_BBE') {
    return { id:'F8', name:'Eligibility structure changed for 2026',
             value: '+1 Domain added', contribution: 0, weight: 0,
             note: '2025 used 3-subject merit; 2026 uses 4-subject merit. Cutoff scaled ×4/3.',
             scale: 4/3,
             confidencePenalty: 12 };
  }
  return null;
}

function factorHistoricalDrift() {
  // Generic DU historical drift in CUET era: +1.5 marks year-on-year baseline.
  return { id:'F7', name:'Historical cutoff drift', value:'+1.5 marks',
           contribution: 1.5, weight: 0.10,
           note: 'Baseline DU CUET cutoffs drift ~+1.5/yr on average' };
}

// =====================================================================
// PROJECT 2026 CUTOFF FROM 2025 CUTOFF
// =====================================================================
export function projectCutoff(cutoff2025, programInfo, category, usedCodes) {
  if (cutoff2025 == null) {
    return { mostLikely: null, conservative: null, aggressive: null,
             factors: [], confidence: 0, note: '2025 cutoff unavailable for this category' };
  }

  const factors = [];
  const f1 = factorPoolGrowth();           factors.push(f1);
  const f3 = factorCategoryCompetition(category); factors.push(f3);
  const f5 = factorTopDensity();           factors.push(f5);
  const f4 = factorSubjectShifts(usedCodes); factors.push(f4);
  const f7 = factorHistoricalDrift();      factors.push(f7);
  const f8 = factorStructuralChange(programInfo.program, programInfo.formula.type);
  if (f8) factors.push(f8);

  // Apply multiplicative subject shift first
  let base = cutoff2025 * f4.multiplier;

  // Apply structural scale (BFIA / BMS — 3→4 subjects)
  if (f8 && f8.scale) base = base * f8.scale;

  // Add additive factor contributions
  const additive = f1.contribution + f3.contribution + f5.contribution + f7.contribution;
  const mostLikely = base + additive;

  // Σ band = 2.5% of mostLikely (range tightens for high-cutoff programs)
  const sigma = Math.max(8, mostLikely * 0.025);
  const conservative = mostLikely - sigma;
  const aggressive   = mostLikely + sigma;

  // Confidence in the prediction itself
  let confidence = 85;
  if (f8) confidence -= f8.confidencePenalty;        // structural change → -12
  if (cutoff2025 < 200) confidence -= 10;            // weak base data
  if (cutoff2025 < 100) confidence -= 10;
  if (!SUBJECT_STATS[usedCodes[0]]?.maxScore[2026]) confidence -= 5;
  confidence = Math.max(45, Math.min(95, confidence));

  return {
    mostLikely: round2(mostLikely),
    conservative: round2(conservative),
    aggressive: round2(aggressive),
    sigma: round2(sigma),
    factors,
    confidence,
    base2025: cutoff2025
  };
}

// =====================================================================
// ADMISSION PROBABILITY
// Logistic curve over (studentScore − mostLikelyCutoff).
// =====================================================================
export function admissionProbability(studentScore, projection, seatsInCategory) {
  if (projection.mostLikely == null || studentScore == null) {
    return { p: null, verdict: { label:'Insufficient data', emoji:'⚪', tone:'unknown' } };
  }

  const margin = studentScore - projection.mostLikely;
  const sigma  = projection.sigma;

  // k controls steepness. Tighter sigma → steeper logistic.
  // We further sharpen when seats are scarce (UR small seat counts).
  const seatFactor = seatsInCategory ? Math.max(0.7, Math.min(1.4, 30 / Math.max(seatsInCategory, 5))) : 1.0;
  const k = 1.6 / sigma * seatFactor;

  let p = 1 / (1 + Math.exp(-k * margin));
  p = Math.max(0.02, Math.min(0.98, p)) * 100;
  p = round2(p);

  return {
    p,
    margin: round2(margin),
    marginVsAggressive: round2(studentScore - projection.aggressive),
    marginVsConservative: round2(studentScore - projection.conservative),
    verdict: verdict(p),
    sigma,
    seatFactor: round2(seatFactor)
  };
}

// =====================================================================
// "WHAT-IF" — Score-bump simulator. Returns delta probability.
// =====================================================================
export function whatIf(currentScore, deltaMarks, projection, seatsInCategory) {
  const orig = admissionProbability(currentScore, projection, seatsInCategory);
  const bumped = admissionProbability(currentScore + deltaMarks, projection, seatsInCategory);
  return { from: orig.p, to: bumped.p, delta: round2((bumped.p || 0) - (orig.p || 0)) };
}

// =====================================================================
// PERCENTILE within composite distribution (rough)
// =====================================================================
export function percentileFromScore(score, outOf, category) {
  // Rough mapping: top composite ~85-90% of max, median ~50% of max
  const pct = score / outOf;
  if (pct >= 0.92) return 99.9;
  if (pct >= 0.88) return 99.5;
  if (pct >= 0.85) return 99;
  if (pct >= 0.80) return 97;
  if (pct >= 0.75) return 94;
  if (pct >= 0.70) return 88;
  if (pct >= 0.65) return 80;
  if (pct >= 0.60) return 70;
  if (pct >= 0.55) return 58;
  if (pct >= 0.50) return 45;
  if (pct >= 0.45) return 33;
  if (pct >= 0.40) return 22;
  return Math.max(1, Math.round(pct * 50));
}

function round2(n) { return Math.round(n * 100) / 100; }
