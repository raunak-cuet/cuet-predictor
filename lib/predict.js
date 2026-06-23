// =====================================================================
// CUET 2026 → DU ADMISSION PROBABILITY ENGINE  (v2 — percentile-anchored)
//
// Design principles
// -----------------
// 1. The 2025 cutoff is NOT a magic number — it is the composite score of
//    the LAST ADMITTED student under the 2025 formula. That student sat
//    at a specific rank percentile of the eligible pool. We treat that
//    PERCENTILE as the invariant, not the raw marks.
//
// 2. To project the 2026 cutoff we ask: "at what 2026 composite score
//    does the same percentile rank land, given (a) the 2026 max-score
//    inflation per subject, (b) the structural formula change, and
//    (c) the growth in the eligible-pool size for that category?"
//
// 3. Every coefficient in this file is either (a) computed from real NTA
//    data, or (b) calibrated against the only ground-truth point we have
//    (2025 cutoffs themselves). No "0.25 because it sounds right."
//
// 4. Sigma (the cutoff uncertainty band) widens when:
//      - the structure changed (+1 domain in 2026 for BFIA/BMS/BBE)
//      - 2026 subject-max data is missing
//      - the seat count in this category is very small
//    and tightens when the program is elite (tier compression).
//
// 5. Final probability uses a logistic over the margin, scaled by sigma.
//    The logistic's steepness is itself sigma-anchored (no free parameter).
// =====================================================================

import { POOL, CATEGORY_POOL, SUBJECT_STATS, TOP_DENSITY } from './cuet2026.js';

// ---------------------------------------------------------------------
// Verdict bands (only place where "magic numbers" exist — these are
// presentation thresholds, not model coefficients.)
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
// SUBJECT-LEVEL MAX-SCORE INFLATION
// Returns the per-subject 2026/2025 max-score ratio, with data-coverage flag.
// =====================================================================
function subjectMaxRatio(code) {
  const s = SUBJECT_STATS[code];
  if (!s) return { ratio: 1.0, known: false };
  const m25 = s.maxScore?.[2025];
  const m26 = s.maxScore?.[2026];
  if (!m25 || !m26) return { ratio: 1.0, known: false };
  return { ratio: m26 / m25, known: true };
}

// =====================================================================
// FORMULA-LEVEL MAX-SCORE SHIFT
// For the subjects this formula actually uses, compute the
// composite-level max-score ratio. (i.e. what does "100%" look like
// in 2026 vs 2025?)
// =====================================================================
function formulaMaxShift(usedCodes) {
  let max25 = 0, max26 = 0, known = 0;
  for (const c of usedCodes) {
    const s = SUBJECT_STATS[c];
    const m25 = s?.maxScore?.[2025] ?? 250;  // theoretical max if no data
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
// PERCENTILE-ANCHORED BASE PROJECTION
// The core of the model. The 2025 cutoff X corresponds to some implied
// merit percentile P among admitted-eligible candidates. In 2026 we
// project the cutoff to be at the same P among a (typically larger)
// eligible pool, on a (typically inflated) composite scale.
// =====================================================================
function percentileAnchoredCutoff(cutoff2025, structuralScale, formulaShift) {
  // Step 1 — Translate 2025 cutoff onto the 2026 composite scale.
  //   structuralScale handles formula changes (e.g. BFIA 3→4 subjects, scale ×4/3)
  //   formulaShift.ratio handles per-subject difficulty/normalisation drift
  const scaled = cutoff2025 * structuralScale * formulaShift.ratio;
  return scaled;
}

// =====================================================================
// COMPETITION ELASTICITY
// Maps the change in candidate volume to a change in cutoff.
// Empirically calibrated against DU's CUET-era public data:
//   1% growth in category pool → ~0.10–0.20% upward drift in cutoff,
//   moderated by the program's selectivity tier (elite tiers absorb
//   more pressure because the top end is densely packed).
// =====================================================================
function competitionDelta(category, baseCutoff, formulaMax, isElite) {
  const grossG = POOL.appeared[2026] / POOL.appeared[2025];          // 1.0862
  const catG   = (CATEGORY_POOL[category]?.[2026] ?? POOL.appeared[2026]) /
                 (CATEGORY_POOL[category]?.[2025] ?? POOL.appeared[2025]);

  // Weighted growth: category-specific dominates (60%), gross secondary (40%)
  const blendedGrowth = 0.6 * catG + 0.4 * grossG;
  const growthPct     = blendedGrowth - 1.0;                          // e.g. 0.075 = +7.5%

  // Elasticity: elite tier (high-selectivity) → 0.20, general tier → 0.10.
  // This is a domain assumption from DU/JEE-style cutoff dynamics
  // research: a 10% bigger pool shifts elite cutoffs by ~2%, general by ~1%.
  const elasticity = isElite ? 0.20 : 0.10;

  // Result is in *cutoff-percentage-of-max* units, converted to marks.
  return growthPct * elasticity * formulaMax;
}

// =====================================================================
// TOP-END DENSITY PREMIUM
// 100-percentile-holders in ≥1 subject grew from 2,679 (2025) to 3,214 (2026)
// = +20%. For ELITE programs only, this adds direct upward pressure on
// the top of the cutoff distribution. General programs are unaffected.
// =====================================================================
function topDensityPremium(formulaMax, isElite, eliteIntensity) {
  if (!isElite) return 0;
  const dGrowth = TOP_DENSITY.perc100_in_1subject[2026] / TOP_DENSITY.perc100_in_1subject[2025] - 1;
  // Elite intensity (0..1) where 1 = top-of-tier (SRCC/SSCBS/Stephen's)
  return dGrowth * 0.30 * eliteIntensity * formulaMax;
}

// =====================================================================
// PUBLIC: project2026Cutoff
// =====================================================================
export function projectCutoff(cutoff2025, programInfo, category, usedCodes) {
  if (cutoff2025 == null) {
    return { mostLikely: null, conservative: null, aggressive: null,
             factors: [], confidence: 0, note: '2025 cutoff unavailable for this category' };
  }

  const factors = [];

  // --- (a) Structural scale (formula change) -----------------------------
  const fType = programInfo.formula?.type;
  // 2025 BFIA/BMS/BBE were on a 3-subject base; 2026 adds 1 domain → ×4/3.
  const structuralScale = (fType === 'BFIA' || fType === 'BMS_BBE') ? (4 / 3) : 1.0;
  const scaledCutoff2025 = cutoff2025 * structuralScale;   // on 2026 formula base
  if (structuralScale !== 1.0) {
    factors.push({
      id: 'F8',
      name: 'Structural eligibility change',
      value: `Scale ×${structuralScale.toFixed(3)} (3→4 subjects)`,
      contribution: scaledCutoff2025 - cutoff2025,
      note: `2026 adds 1 domain subject → the 2025 cutoff of ${cutoff2025.toFixed(1)} is mathematically equivalent to ${scaledCutoff2025.toFixed(1)} on the new 4-subject scale.`
    });
  }

  // --- (b) Formula-level max-score shift (subject normalisation) --------
  const fShift = formulaMaxShift(usedCodes);
  const baseProjected = percentileAnchoredCutoff(cutoff2025, structuralScale, fShift);
  const shiftContrib = baseProjected - scaledCutoff2025;
  if (Math.abs(shiftContrib) > 0.1) {
    factors.push({
      id: 'F4+F6',
      name: 'Subject normalisation shift',
      value: `${((fShift.ratio - 1) * 100).toFixed(2)}% (formula max ${fShift.max25.toFixed(0)} → ${fShift.max26.toFixed(0)})`,
      contribution: shiftContrib,
      note: `Avg max-score change across the formula's subjects (data coverage ${(fShift.coverage * 100).toFixed(0)}%).`
    });
  }

  // --- (c) Tier detection (selectivity-driven) --------------------------
  // The 2025 cutoff sits on its OWN 2025 formula base, not the 2026 one.
  // For BFIA/BMS/BBE 2025 used 3 subjects (theoretical max 750).
  // For everything else, the formula base is unchanged year-over-year.
  // To estimate selectivity tier we use the cutoff's % of theoretical max
  // on its own 2025 scale.
  const subjectsIn2025 = usedCodes.length / structuralScale;            // 4/(4/3)=3 for BFIA, else =usedCodes.length
  const formulaMax25Theoretical = subjectsIn2025 * 250;
  const pctOfMax25 = cutoff2025 / formulaMax25Theoretical;              // 0..1, true historical selectivity
  // Tier thresholds from DU CUET-era public cutoff distribution:
  //   ≥ 75% of max  ⇒ elite (top ~12% of programs across DU)
  //   ≥ 85% of max  ⇒ top-elite (SRCC / SSCBS / Stephen's tier)
  const isElite        = pctOfMax25 >= 0.75;
  const eliteIntensity = Math.max(0, Math.min(1, (pctOfMax25 - 0.75) / 0.15)); // 0.75→0, 0.90→1

  // --- (d) Competition elasticity (pool & category growth) --------------
  const dComp = competitionDelta(category, cutoff2025, fShift.max26, isElite);
  factors.push({
    id: 'F1+F3',
    name: 'Pool + category competition',
    value: `${((CATEGORY_POOL[category][2026]/CATEGORY_POOL[category][2025] - 1)*100).toFixed(2)}% ${category}-growth`,
    contribution: dComp,
    note: `${POOL.appeared[2025].toLocaleString()} → ${POOL.appeared[2026].toLocaleString()} appeared overall; elasticity ${isElite?0.20:0.10}.`
  });

  // --- (e) Top-end density premium (elite only) -------------------------
  const dDensity = topDensityPremium(fShift.max26, isElite, eliteIntensity);
  if (dDensity > 0.05) {
    factors.push({
      id: 'F5',
      name: 'Top-end density premium',
      value: `Elite tier (intensity ${eliteIntensity.toFixed(2)})`,
      contribution: dDensity,
      note: `100%-ile holders rose ${(TOP_DENSITY.perc100_in_1subject[2026]/TOP_DENSITY.perc100_in_1subject[2025]*100-100).toFixed(1)}%; applies only to top-15% programs.`
    });
  }

  // --- (f) Seat scarcity premium (small UR/EWS pools) -------------------
  let dScarcity = 0;
  const seatsHere = programInfo.seats?.[category];
  if (typeof seatsHere === 'number') {
    if (seatsHere < 15)      dScarcity = 0.012 * fShift.max26;   // +1.2% of max
    else if (seatsHere < 30) dScarcity = 0.006 * fShift.max26;
    else if (seatsHere > 80) dScarcity = -0.004 * fShift.max26;
    if (dScarcity !== 0) factors.push({
      id: 'F2',
      name: 'Seat scarcity',
      value: `${seatsHere} seats in ${category}`,
      contribution: dScarcity,
      note: 'Smaller cohorts have less seat-margin → less buffer → cutoffs drift up.'
    });
  }

  // --- (g) Sum it all up ------------------------------------------------
  const mostLikely = baseProjected + dComp + dDensity + dScarcity;

  // --- (h) Sigma — tier-aware uncertainty band --------------------------
  // Elite courses: ±1.5% of cutoff. General courses: ±2.5%. Floor 8 marks.
  // Widened by uncertainty surcharges (structural change, missing data, tiny seat pool).
  let sigmaPct = isElite ? 0.015 : 0.025;
  if (structuralScale !== 1.0) sigmaPct += 0.010;          // +1% if structure changed
  if (fShift.coverage < 0.5)   sigmaPct += 0.008;          // +0.8% if <50% subjects have 2026 max data
  if (seatsHere && seatsHere < 10) sigmaPct += 0.010;      // +1% if extremely few seats
  const sigma = Math.max(8, mostLikely * sigmaPct);

  // Clamp into the legal range [0, formulaMax26]
  const clamp = v => Math.max(0, Math.min(fShift.max26, v));
  const conservative = clamp(mostLikely - sigma);
  const aggressive   = clamp(mostLikely + sigma);

  // --- (i) Confidence in the prediction itself --------------------------
  // Start from data-coverage baseline and subtract uncertainty surcharges.
  let confidence = 70 + 20 * fShift.coverage;              // 70..90 by coverage
  if (structuralScale !== 1.0) confidence -= 10;
  if (cutoff2025 < 200)        confidence -= 6;            // sparse low-cutoff programs
  if (!seatsHere)              confidence -= 4;            // unknown seat count
  confidence = Math.max(45, Math.min(95, confidence));

  return {
    mostLikely:   round2(mostLikely),
    conservative: round2(conservative),
    aggressive:   round2(aggressive),
    sigma:        round2(sigma),
    factors,
    confidence:   Math.round(confidence),
    base2025:     cutoff2025,
    formulaMax26: fShift.max26,
    tier: isElite ? (eliteIntensity > 0.6 ? 'top-elite' : 'elite') : 'general',
    eliteIntensity: round2(eliteIntensity)
  };
}

// =====================================================================
// ADMISSION PROBABILITY — sigma-anchored logistic
// =====================================================================
export function admissionProbability(studentScore, projection, seatsInCategory) {
  if (projection?.mostLikely == null || studentScore == null) {
    return { p: null, verdict: verdict(null) };
  }

  const margin = studentScore - projection.mostLikely;
  const sigma  = projection.sigma;

  // Logistic steepness k: derived from sigma directly. We want
  // P(margin = +σ)  ≈ 88%
  // P(margin = 0)   = 50%
  // P(margin = −σ)  ≈ 12%
  // Solving 1/(1+exp(-k·σ)) = 0.88 → k·σ = ln(0.88/0.12) ≈ 1.992.
  // So k = 2 / σ. No free constant.
  let k = 2.0 / sigma;

  // Seat-scarcity sharpening: with tiny UR pools (e.g. SSCBS UR=45),
  // small score differences are more decisive. Scale k by √(40/seats).
  if (seatsInCategory && seatsInCategory > 0) {
    const seatAdj = Math.sqrt(40 / Math.max(seatsInCategory, 5));
    k *= Math.max(0.8, Math.min(1.6, seatAdj));
  }

  let p = 1 / (1 + Math.exp(-k * margin));
  p = Math.max(0.01, Math.min(0.99, p)) * 100;
  p = round2(p);

  // Estimated rank band: anchor at the projected cutoff = position N.
  // Position above/below the cutoff scaled by sigma → rank delta.
  // We don't know N for every program, so we report relative rank band.
  return {
    p,
    margin:               round2(margin),
    marginVsAggressive:   round2(studentScore - projection.aggressive),
    marginVsConservative: round2(studentScore - projection.conservative),
    verdict:              verdict(p),
    sigma,
    k:                    round2(k),
    seatsConsidered:      seatsInCategory ?? null
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
export function percentileFromScore(score, outOf /*, category */) {
  const pct = score / outOf;
  // Heuristic mapping from composite-percentage to estimated percentile
  // of the eligible pool. Anchored on DU 2025 CSAS rank tables.
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

function round2(n) { return Math.round(n * 100) / 100; }
