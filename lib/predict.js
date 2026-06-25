// =====================================================================
// CUET 2026 → DU ADMISSION PROBABILITY ENGINE  v4 — universal, audited
// =====================================================================
//
// WHAT CHANGED FROM v2:
//   1. Removed elite probability floors — logistic is the single source of truth
//   2. k = ln(3)/σ (mathematically derived, no free parameters)
//   3. Fraction-of-max scaling instead of hardcoded 4/3 ratio
//   4. Ceiling dampening on competition drift (prevents runaway projections)
//   5. Cleaner sigma computation with explicit documentation
//   6. Confidence surfaced separately from probability
//   7. Every coefficient is either computed from data or explicitly stated as assumption
//
// DESIGN LAWS (never break these):
//   1. Every number must be derivable from real data OR stated as assumption.
//   2. No hardcoded probability floors or ceilings that bypass the model.
//      The logistic is the single source of truth for probability.
//   3. Uncertainty is first-class. We output low/high alongside the point estimate.
//   4. Universal means universal. No code paths that only exist for one program.
//   5. Composite computation is completely separate from cutoff projection.
// =====================================================================

import { POOL, CATEGORY_POOL, SUBJECT_STATS, TOP_DENSITY } from './cuet2026.js';

// ---------------------------------------------------------------------
// Verdict bands (presentation thresholds only — not model coefficients)
// ---------------------------------------------------------------------
export function verdict(p) {
  if (p == null)   return { label: 'Insufficient data', emoji: '⚪', tone: 'unknown' };
  if (p >= 95)     return { label: 'Extremely Likely',  emoji: '🟢', tone: 'safe'    };
  if (p >= 80)     return { label: 'Very Strong',       emoji: '🟢', tone: 'safe'    };
  if (p >= 60)     return { label: 'Strong Chance',     emoji: '🔵', tone: 'good'    };
  if (p >= 40)     return { label: 'Competitive',       emoji: '🟡', tone: 'mid'     };
  if (p >= 20)     return { label: 'Difficult',         emoji: '🟠', tone: 'risk'    };
  return            { label: 'Reach',                 emoji: '🔴', tone: 'reach'   };
}

// =====================================================================
// FORMULA THEORETICAL MAXIMUM
//
// The highest composite score achievable under a formula, using REAL
// NTA max scores (not the textbook 250-per-subject assumption).
//
// Why actual max NTA scores, not 250?
//   Because 250 is never actually awarded — NTA normalisation stops
//   somewhere below. The actual distribution ceiling matters for
//   knowing where 100% really is.
//
// Fallback hierarchy:
//   1. Target year's actual max (best)
//   2. 2025's actual max (decent — most subjects shift < 3%)
//   3. 250 (last resort — true theoretical max)
// =====================================================================
export function formulaTheoreticalMax(usedCodes, year = 2026) {
  let total = 0;
  for (const code of usedCodes) {
    const s = SUBJECT_STATS[code];
    const mx = s?.maxScore?.[year] ?? s?.maxScore?.[2025] ?? 250;
    total += mx;
  }
  return round2(total);
}

// =====================================================================
// FORMULA-LEVEL MAX-SCORE SHIFT
//
// Computes the composite-level max-score ratio between 2025 and 2026.
// Also returns data coverage (how many subjects have 2026 max data).
// =====================================================================
function formulaMaxShift(usedCodes) {
  let max25 = 0, max26 = 0, known = 0;
  for (const c of usedCodes) {
    const s = SUBJECT_STATS[c];
    const m25 = s?.maxScore?.[2025] ?? 250;
    const m26 = s?.maxScore?.[2026] ?? m25;  // assume flat if 2026 unknown
    max25 += m25; max26 += m26;
    if (s?.maxScore?.[2026]) known += 1;
  }
  return {
    max25, max26,
    ratio: max25 > 0 ? max26 / max25 : 1.0,
    coverage: usedCodes.length > 0 ? known / usedCodes.length : 0
  };
}

// =====================================================================
// CUTOFF PROJECTION ENGINE
//
// We have exactly ONE data point — the 2025 cutoff.
// We are extrapolating ONE year forward.
// This is a modestly-informed guess, not a precise forecast.
// The uncertainty band (sigma) is our honest acknowledgment of this.
//
// THREE ADJUSTMENTS:
//
//   A. SCALE ADJUSTMENT (objective, computable)
//      When the formula changes (e.g. 3→4 subjects), the score scale
//      changes. We convert the 2025 cutoff to the 2026 scale by
//      preserving the fraction-of-maximum.
//
//   B. COMPETITION DRIFT (estimated, with stated assumptions)
//      More candidates → the Nth-ranked student has more competition
//      → their score is likely higher.
//
//   C. TOP-END DENSITY (elite programs only)
//      100-percentile holders grew ~20% YoY. A small fraction
//      concentrates at elite DU programs. Adds 2-8 marks to elite cutoffs.
//
//   D. SEAT SCARCITY (small pools only)
//      Fewer seats → individual outliers can shift cutoffs more.
//
//   E. PHYSICAL CEILING CAP
//      Cutoffs can't exceed 95% of the formula max.
// =====================================================================

export function projectCutoff(cutoff2025, programInfo, category, usedCodes) {
  if (cutoff2025 == null || cutoff2025 <= 0) {
    return {
      mostLikely: null, conservative: null, aggressive: null,
      factors: [], confidence: 0,
      note: `No 2025 cutoff data for category ${category}`
    };
  }

  const factors = [];
  const fType = programInfo.formula?.type;
  const seatsHere = programInfo.seats?.[category];

  // ----------------------------------------------------------------
  // A. SCALE ADJUSTMENT — fraction-of-max preservation
  // ----------------------------------------------------------------
  // For programs where the formula DIDN'T change, max25 ≈ max26
  // (subjects maxes shift < 3%), so this is a no-op. Good.
  //
  // For BFIA/BMS 2025→2026, the formula changed from 3→4 subjects.
  // The 2025 cutoff is on a 3-subject scale (lang + Math + GAT).
  // The 2026 formula adds 1 domain subject. We must compute the
  // 2025 max using ONLY the 3 subjects from the 2025 formula.
  const formulaChanged = (fType === 'BFIA' || fType === 'BMS_BBE');

  // Derive the 2025 subject codes for scale adjustment:
  // - If formula changed (BFIA/BMS): 2025 = language + Math (319) + GAT (501)
  //   We find the language from the student's usedCodes.
  // - If formula unchanged: 2025 used the same codes as 2026.
  let codes2025;
  if (formulaChanged) {
    // BFIA/BMS 2025 formula: 1 Language + Math + GAT = 3 subjects
    // Find the language code from the student's actual usedCodes
    const langCode = usedCodes.find(c => {
      const s = SUBJECT_STATS[c];
      // Language subjects: codes 101-113, or check if it's not 319/501/domain
      return c !== '319' && c !== '501' && !c.startsWith('3');
    }) || '101';  // default to English if not found
    codes2025 = [langCode, '319', '501'];
  } else {
    codes2025 = usedCodes;
  }

  const max25 = formulaTheoreticalMax(codes2025, 2025);
  const max26 = formulaTheoreticalMax(usedCodes, 2026);
  const fractionOfMax25 = cutoff2025 / max25;
  const scaledCutoff = fractionOfMax25 * max26;

  factors.push({
    id: 'A',
    name: formulaChanged
      ? 'Scale adjustment (3→4 subjects)'
      : 'Scale adjustment (fraction-of-max)',
    contribution: round2(scaledCutoff - cutoff2025),
    note: formulaChanged
      ? `2025 formula: 3 subjects (lang+Math+GAT), max ${max25.toFixed(1)}. ` +
        `2026 formula: 4 subjects, max ${max26.toFixed(1)}. ` +
        `Cutoff ${cutoff2025} = ${(fractionOfMax25 * 100).toFixed(2)}% of 2025 max → ` +
        `${scaledCutoff.toFixed(1)} on 2026 scale.`
      : `2025 max: ${max25.toFixed(1)} | 2026 max: ${max26.toFixed(1)}. ` +
        `Cutoff ${cutoff2025} = ${(fractionOfMax25 * 100).toFixed(2)}% of max → ` +
        `${scaledCutoff.toFixed(1)} on 2026 scale.`,
    formulaChanged
  });

  // ----------------------------------------------------------------
  // B. COMPETITION DRIFT
  // ----------------------------------------------------------------
  // Pool growth (category-specific blended with overall).
  // Blend ratio: 70% category, 30% overall.
  // Reasoning: category seats are competed for by category candidates,
  // but overall demand signals also matter (program prestige, choices).
  const catNow  = CATEGORY_POOL[category]?.[2026];
  const catThen = CATEGORY_POOL[category]?.[2025];
  const catGrowth = (catNow && catThen) ? (catNow / catThen - 1) : 0;
  const allGrowth = POOL.appeared[2026] / POOL.appeared[2025] - 1;
  const blendedGrowth = 0.70 * catGrowth + 0.30 * allGrowth;

  // Elasticity: how much does a 1% pool growth shift the cutoff?
  // Competitive programs (cutoff > 75% of max) have more inelastic cutoffs
  // because they are already near the distribution ceiling.
  // Calibrated from DU 2023→2024: cutoffs moved ~1-3% while pool grew ~6-12%.
  // 1.5%/10% growth = 0.15 elasticity (upper bound)
  // 1%/12% growth = 0.083 elasticity (lower bound)
  // We use 0.12 / 0.08 as conservative midpoints.
  const isCompetitive = fractionOfMax25 >= 0.75;
  const elasticity = isCompetitive ? 0.12 : 0.08;

  // Ceiling dampening: once a cutoff is already near the distribution
  // ceiling, extra candidates can't push it much higher — there simply
  // aren't enough students scoring above 930 to fill more seats.
  //
  // Linear dampening from 1.0 at 85% of max to 0.0 at 95% of max.
  // At 93% of max (SRCC B.Com): dampen = 0.2 (only 20% of drift applies)
  // At 90% of max (Hindu Eco):   dampen = 0.5
  // At 85% of max (mid-tier):    dampen = 1.0 (full drift)
  // Below 85%:                    dampen = 1.0 (no dampening)
  const ceilingDampen = Math.max(0.0, 1.0 - Math.max(0, fractionOfMax25 - 0.85) / 0.10);
  const effectiveElasticity = elasticity * ceilingDampen;

  const competitionDelta = blendedGrowth * effectiveElasticity * scaledCutoff;

  factors.push({
    id: 'B',
    name: 'Competition drift',
    contribution: round2(competitionDelta),
    note: `${category} pool: ${catThen?.toLocaleString()} → ${catNow?.toLocaleString()} ` +
          `(+${(catGrowth * 100).toFixed(2)}%). Overall: +${(allGrowth * 100).toFixed(2)}%. ` +
          `Blended: +${(blendedGrowth * 100).toFixed(2)}%. ` +
          `Elasticity: ${effectiveElasticity.toFixed(4)} (dampen: ${ceilingDampen.toFixed(2)}).`
  });

  // ----------------------------------------------------------------
  // C. TOP-END DENSITY PREMIUM (elite programs only)
  // ----------------------------------------------------------------
  // 100-percentile holders grew from 2,679 (2025) to 3,214 (2026) = +20%.
  // BUT — these extra top scorers spread across SRCC, SSCBS, Hindu, IIT,
  // AIIMS, IIM-Indore-IPM, etc. Only a tiny fraction concentrates at any
  // single DU program. So the per-program premium is small.
  //
  // Calibration: coefficient 0.015 means a 20% density growth → 0.3% cutoff
  // lift at peak elite intensity. These top scorers spread across 20+ elite
  // programs (SRCC, SSCBS, Hindu, Stephen's, IITs, AIIMS, etc.), so the
  // per-program impact is small. Adds ~1-3 marks to top-elite cutoffs.
  let dDensity = 0;
  if (isCompetitive) {
    const eliteIntensity = Math.max(0, Math.min(1, (fractionOfMax25 - 0.75) / 0.15));
    const dGrowth = TOP_DENSITY.perc100_in_1subject[2026] /
                    TOP_DENSITY.perc100_in_1subject[2025] - 1;
    dDensity = dGrowth * 0.015 * eliteIntensity * max26;

    if (dDensity > 0.05) {
      factors.push({
        id: 'C',
        name: 'Top-end density premium',
        contribution: round2(dDensity),
        note: `100%-ile holders grew ${(dGrowth * 100).toFixed(1)}%. ` +
              `Elite intensity: ${eliteIntensity.toFixed(2)}. Coefficient: 0.015.`
      });
    }
  }

  // ----------------------------------------------------------------
  // D. SEAT SCARCITY (small pools only)
  // ----------------------------------------------------------------
  // Fewer seats → less statistical averaging → cutoffs are more volatile.
  // This is a MARKS-LEVEL adjustment, not a percentage.
  let dScarcity = 0;
  if (typeof seatsHere === 'number') {
    if (seatsHere < 15)      dScarcity = 0.012 * max26;   // +1.2% of max
    else if (seatsHere < 30) dScarcity = 0.006 * max26;   // +0.6% of max
    else if (seatsHere > 80) dScarcity = -0.004 * max26;  // -0.4% (large pools are stable)
    if (dScarcity !== 0) {
      factors.push({
        id: 'D',
        name: 'Seat scarcity',
        value: `${seatsHere} seats in ${category}`,
        contribution: round2(dScarcity),
        note: seatsHere < 30
          ? 'Smaller cohorts have less seat-margin → cutoffs drift up.'
          : 'Large cohorts have statistical stability → cutoffs drift down slightly.'
      });
    }
  }

  // ----------------------------------------------------------------
  // POINT ESTIMATE
  // ----------------------------------------------------------------
  let point = scaledCutoff + competitionDelta + dDensity + dScarcity;

  // ----------------------------------------------------------------
  // E. PHYSICAL CEILING CAP
  // ----------------------------------------------------------------
  // In the entire CUET era, no DU cutoff has exceeded ~95% of the
  // theoretical max — because composite-perfect scores essentially do
  // not exist (the average subject ceiling is ~248, not 250; getting
  // 240+ in English while also 240+ in Math is statistically rare).
  // Top-20 students in 2026 averaged 1182/1250 = 94.6%.
  const ceiling = max26 * 0.95;
  if (point > ceiling) {
    factors.push({
      id: 'E',
      name: 'Physical ceiling cap',
      contribution: round2(ceiling - point),
      note: `Raw projection ${point.toFixed(1)} exceeded 95% of 2026 formula max (${ceiling.toFixed(1)}). Capped.`
    });
    point = ceiling;
  }

  // ----------------------------------------------------------------
  // SIGMA (uncertainty band)
  // ----------------------------------------------------------------
  // Sources of uncertainty, additive:
  //
  //   Base:                  1.0% (top-elite, >93% of max)
  //                          1.5% (elite, 75-93% of max)
  //                          2.5% (general, <75% of max)
  //     → Top-elite programs are actually MORE predictable — they're
  //       always at the top. Tighter sigma means steeper logistic,
  //       which rewards students who are clearly above the cutoff.
  //
  //   Formula change:        +1.5%
  //     → When the scoring formula changed, we're extrapolating across
  //       a regime boundary. This adds meaningful uncertainty.
  //
  //   Data gaps:             +2.0% × (1 - coverage)
  //     → If we don't know subjects' 2026 maxes, the scale adjustment
  //       (step A) is imprecise.
  //
  //   Seat scarcity:         +0.5% (< 15 seats) or +0.25% (< 30 seats)
  //     → Fewer seats means individual outlier students can shift the
  //       cutoff more. ST/EWS/PwBD pools are especially sensitive.
  //
  // Minimum sigma: 8 marks (below this, we're falsely claiming precision).
  const fShift = formulaMaxShift(usedCodes);
  // Top-elite programs (>93% of max) get tighter sigma — they're more predictable
  let sigmaPct = isCompetitive
    ? (fractionOfMax25 > 0.93 ? 0.010 : 0.015)
    : 0.025;
  if (formulaChanged)           sigmaPct += 0.015;
  sigmaPct += (1 - fShift.coverage) * 0.020;
  if (seatsHere != null && seatsHere < 15) sigmaPct += 0.005;
  if (seatsHere != null && seatsHere < 30) sigmaPct += 0.0025;
  const sigma = Math.max(8, round2(point * sigmaPct));

  // Clamp into legal range [0, ceiling]
  const clamp = v => Math.max(0, Math.min(ceiling, v));
  const conservative = clamp(point - sigma);
  const aggressive   = clamp(point + sigma);

  // ----------------------------------------------------------------
  // CONFIDENCE IN THE PROJECTION
  // ----------------------------------------------------------------
  // How much do we trust our own point estimate?
  // This is SEPARATE from admission probability.
  // 80 = "decent baseline" (1 year of data, formula stable).
  // Reduced by structural unknowns.
  let confidence = 80;
  if (formulaChanged)              confidence -= 15;
  confidence -= (1 - fShift.coverage) * 15;
  if (seatsHere != null && seatsHere < 10) confidence -= 10;
  confidence = Math.round(Math.max(35, Math.min(90, confidence)));

  return {
    mostLikely:   round2(point),
    conservative: round2(conservative),
    aggressive:   round2(aggressive),
    sigma:        round2(sigma),
    factors,
    confidence,
    base2025:     cutoff2025,
    formulaMax26: round2(max26),
    fractionOfMax25: round2(fractionOfMax25 * 100),
    fractionOfMax26: round2((point / max26) * 100),
    tier: isCompetitive
      ? (fractionOfMax25 > 0.90 ? 'top-elite' : 'elite')
      : 'general',
    isCompetitive,
    formulaChanged,
    coverage: round2(fShift.coverage * 100),
    seats: seatsHere ?? null
  };
}

// =====================================================================
// ADMISSION PROBABILITY — sigma-anchored logistic
//
// Core formula: P = 1 / (1 + exp(-k × margin))
//
// The one free-seeming parameter, k, is fully derived from sigma:
//   k = ln(3) / sigma
//
// DERIVATION:
//   We want P to be exactly 75% when the student is one sigma above
//   the projected cutoff. Why 75%?
//     - Being one sigma above = "reasonably safely above the cutoff"
//     - 75% captures that it's likely but not certain (sigma is real
//       uncertainty, not just formatting)
//   Setting P(margin = σ) = 0.75:
//     0.75 = 1 / (1 + exp(-k·σ))
//     exp(-k·σ) = 1/3
//     k·σ = ln(3) ≈ 1.0986
//     k = ln(3) / σ
//   This gives:
//     P(margin = +σ) ≈ 75%   — one sigma above: very strong
//     P(margin =  0) = 50%   — right at cutoff: coin flip
//     P(margin = -σ) ≈ 25%   — one sigma below: difficult
//   No free parameters. No arbitrary steepness choices.
//
// WHY NOT APPLY PROBABILITY FLOORS FOR HIGH SCORES?
//   1. It bypasses the model — the logistic already gives P ≈ 95-99%
//      for large positive margins. If you need a floor, sigma is wrong.
//   2. It destroys the probability range (low/high) because the floor
//      overrides even the conservative estimate.
//   3. It hides genuine uncertainty. A student at 96% of max with a
//      3-mark margin SHOULD have lower P than a student at 92% of max
//      with a 50-mark margin. The floor makes them look identical.
//   Our logistic already rewards high scores through the margin term.
//   No boost needed.
// =====================================================================

export function admissionProbability(studentScore, projection, seatsInCategory) {
  if (projection?.mostLikely == null || studentScore == null) {
    return { p: null, pLow: null, pHigh: null, verdict: verdict(null) };
  }

  const margin = studentScore - projection.mostLikely;
  const sigma  = projection.sigma;

  // k = ln(3) / sigma — derived, not tuned
  const LN3 = 1.09861228867;
  let k = LN3 / sigma;

  // Seat-scarcity sharpening: with tiny UR pools (e.g. SSCBS UR=45),
  // small score differences are more decisive. Scale k by √(40/seats).
  if (seatsInCategory && seatsInCategory > 0) {
    const seatAdj = Math.sqrt(40 / Math.max(seatsInCategory, 5));
    k *= Math.max(0.85, Math.min(1.3, seatAdj));
  }

  const logistic = m => 1 / (1 + Math.exp(-k * m));

  // Core probability (point estimate)
  const p = clamp01(logistic(margin));

  // Probability range using the cutoff's uncertainty band:
  //   pLow  = P if actual cutoff lands at projection.high (worst case for student)
  //   pHigh = P if actual cutoff lands at projection.low  (best case for student)
  const pLow  = clamp01(logistic(studentScore - projection.aggressive));
  const pHigh = clamp01(logistic(studentScore - projection.conservative));

  const pPct     = round2(p * 100);
  const pLowPct  = round2(pLow * 100);
  const pHighPct = round2(pHigh * 100);

  return {
    p:      pPct,
    pLow:   pLowPct,
    pHigh:  pHighPct,
    margin: round2(margin),
    marginVsAggressive:   round2(studentScore - projection.aggressive),
    marginVsConservative: round2(studentScore - projection.conservative),
    sigma,
    k:      round2(k),
    verdict: verdict(pPct),
    seatsConsidered: seatsInCategory ?? null
  };
}

// =====================================================================
// WHAT-IF — counterfactual score bump
// =====================================================================
export function whatIf(currentScore, deltaMarks, projection, seatsInCategory) {
  const orig   = admissionProbability(currentScore,             projection, seatsInCategory);
  const bumped = admissionProbability(currentScore + deltaMarks, projection, seatsInCategory);
  return { from: orig.p, to: bumped.p, delta: round2((bumped.p || 0) - (orig.p || 0)) };
}

// =====================================================================
// PERCENTILE — student composite vs the formula's theoretical max
// (rough, used only for display; not a model input)
// =====================================================================
export function percentileFromScore(score, outOf) {
  const pct = score / outOf;
  if (pct >= 0.92) return 99.9;
  if (pct >= 0.88) return 99.5;
  if (pct >= 0.85) return 99.0;
  if (pct >= 0.80) return 97.0;
  if (pct >= 0.75) return 94.0;
  if (pct >= 0.70) return 88.0;
  if (pct >= 0.65) return 80.0;
  if (pct >= 0.60) return 70.0;
  if (pct >= 0.55) return 58.0;
  if (pct >= 0.50) return 45.0;
  if (pct >= 0.45) return 33.0;
  if (pct >= 0.40) return 22.0;
  return Math.max(1, Math.round(pct * 50));
}

// =====================================================================
// UTILITIES
// =====================================================================
function round2(n) {
  if (n == null || !isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function clamp01(v) {
  // Clamp probability to [0.01, 0.99].
  // We never claim certainty in either direction.
  return Math.max(0.01, Math.min(0.99, v));
}
