# DreamSeat Prediction Engine — Full Audit & Comparison

## What I Analyzed
1. **Your current engine** — `lib/predict.js` (v2 percentile-anchored), `lib/engine.js`, `lib/composite.js`, `lib/cuet2026.js`
2. **Claude's niche engine** (the v3 code block) — a self-contained SSCBS/BFIA-only predictor
3. **Claude's HTML outputs** — two different analysis views for the same student

---

## Architecture Comparison

| Aspect | DreamSeat (yours) | Claude's v3 |
|--------|-------------------|-------------|
| **Scope** | Universal (1,526 programs, 20 formula types) | Niche (2 programs hardcoded) |
| **Composite** | Full `switch` over 20 formula types | Simple `required + domainPool` system |
| **Cutoff projection** | 5 factors, percentile-anchored | 2 factors (scale + competition), simpler |
| **Probability** | Logistic with elite floor boosters | Pure logistic, k = ln(3)/σ, no floors |
| **Sigma** | Tier-aware, 4 uncertainty sources | 4 uncertainty sources (similar) |
| **Verdicts** | 6 tiers (95/80/60/40/20) | 6 tiers (90/75/55/40/25) |
| **What-if** | ✅ Yes | ❌ No |
| **AIR calculator** | ✅ Yes (in results page) | ❌ No |
| **Batch mode** | ✅ Yes (engine.js) | ✅ Yes |

---

## What Claude's Engine Does BETTER

### 1. Cleaner k-derivation (no free parameter)
```js
// Claude: k = ln(3) / sigma
// → P(+σ) = 75%, P(0) = 50%, P(-σ) = 25%
// Pure math, zero ambiguity.

// Yours: k = 1.0 / sigma
// → P(+σ) = 73%, P(0) = 50%, P(-σ) = 27%
// Very similar! But ln(3) is the "correct" derivation.
```

### 2. NO probability floor/ceiling hacks
Claude explicitly rejects the "elite floor" pattern your engine uses:
```js
// YOUR CODE (predict.js lines 182-199):
if (studentPctOfMax >= 0.96) eliteFloor = 0.97;
if (studentPctOfMax >= 0.94) eliteFloor = 0.92;
// etc.
p = Math.max(p, eliteFloor);

// CLAUDE'S POSITION:
// "The logistic already gives P ≈ 95-99% for large positive margins.
//  If you need a floor, your sigma is probably too large."
```
**Verdict: Claude is RIGHT here.** Your elite floors bypass the model. If a student at 96% of max with a 3-mark margin gets floored to 97%, you're lying about the uncertainty. The logistic should naturally handle this — if it doesn't, sigma is the problem, not the probability.

### 3. Formula scale adjustment uses ACTUAL NTA maxes, not 250
```js
// Claude: max26 = sum of real maxNTA scores (e.g., 244.04 + 242.40 + 249.54 + 212.65 = 948.63)
// Yours:  formulaMaxShift uses maxScore from SUBJECT_STATS (same approach!)
//         But your structuralScale = 4/3 for BFIA is a RATIO, not fraction-of-max preservation.
```
**Your approach is actually fine here** — you both use real NTA maxes. But Claude's method of preserving `fractionOfMax` is more robust than a fixed `4/3` ratio because it handles per-subject normalization drift automatically.

### 4. Explicit confidence scoring
Claude's engine returns `confidence: 35–90` as a separate field from probability. Your engine has this too (`confidence` in `projectCutoff`), but it's less prominently surfaced.

### 5. Better sigma documentation
Claude documents EXACTLY why each sigma component exists:
- Base: 1.5% (competitive) or 2.5% (other) — "irreducible year-to-year noise"
- Formula change: +1.5% — "extrapolating across a regime boundary"
- Data gaps: +2.0% per missing subject
- Seat scarcity: +0.5% (< 15 seats) or +0.25% (< 30 seats)
- Minimum sigma: 8 marks

---

## What DreamSeat Does BETTER

### 1. UNIVERSAL coverage (1,526 programs vs 2)
Claude's engine is useless for 99.87% of DU programs. Yours handles everything from B.Com (Hons.) at Hindu to B.A. (Hindi + Political Science) at Zakir Husain Evening.

### 2. Richer composite computation
Your `composite.js` handles 20+ formula types with proper domain selection logic. Claude has 6 formula definitions that only cover SSCBS and generic patterns.

### 3. What-if slider
Students can drag -50 to +100 marks and see probability change in real-time. Claude doesn't have this.

### 4. AIR calculator
Exact All India Rank from NTA percentile. Claude doesn't have this.

### 5. Top-end density premium
Your engine accounts for 100-percentile holder growth (+20% YoY). Claude explicitly removes this, calling it "not calibrated on any real data."

### 6. Seat-scarcity sharpening in probability
Your logistic k is adjusted by `√(40/seats)` — tighter curve for tiny seat pools. Claude doesn't do this.

---

## CRITICAL BUGS & ISSUES IN YOUR ENGINE

### Bug 1: Structural scale is hardcoded, not computed
```js
// YOUR CODE:
const structuralScale = (fType === 'BFIA' || fType === 'BMS_BBE') ? (4 / 3) : 1.0;

// PROBLEM: This only works for BFIA/BMS. If DU changes ANY other formula
// in the future, you need a new hardcoded case. Claude's approach of
// preserving fraction-of-max is more robust:
//   scaled = cutoff2025 * (max26 / max25)
// This auto-handles ANY formula change.
```

### Bug 2: Competition blend weights differ between engines
```js
// predict.js: 60% category, 40% gross
// Claude:      70% category, 30% overall
```
These are both reasonable but inconsistent. Need to pick one and justify it.

### Bug 3: Elasticity values are inconsistent
```js
// predict.js competitionDelta(): isElite ? 0.12 : 0.08
// predict.js comment says "0.20 / 0.10" in the factor push
// Claude: isCompetitive ? 0.12 : 0.08
```
The comment in your factor push says `elasticity ${isElite?0.20:0.10}` but the actual code uses `0.12/0.08`. This is a documentation bug.

### Bug 4: Top-density premium is loosely calibrated
```js
// YOUR CODE:
return dGrowth * 0.05 * eliteIntensity * formulaMax;
// Where does 0.05 come from? "Calibrated coefficient" — but against what?
// Claude removes this entirely, saying it's not calibrated on real data.
```
**Recommendation:** Keep it but reduce it. The 100-percentile growth IS real and DOES push elite cutoffs up. But the coefficient should be smaller — maybe 0.02–0.03.

### Bug 5: PwBD/ST fallback discount factors are magic numbers
```js
// YOUR CODE:
const discount = (cat === 'PwBD') ? 0.55 : 0.88;
```
Where does 0.55 come from? Where does 0.88 come from? These should be derived from actual DU data showing PwBD cutoffs as a fraction of ST cutoffs.

### Bug 6: percentileFromScore is a rough heuristic
```js
// YOUR CODE:
if (pct >= 0.92) return 99.9;
if (pct >= 0.88) return 99.5;
// etc.
```
This is used only for display, but it's misleading. A student at 92% of max is NOT necessarily at the 99.9th percentile — it depends on the subject and the distribution shape.

---

## RECOMMENDED IMPROVEMENTS

### Priority 1: Remove elite probability floors
Replace the elite floor hack with better sigma calibration. If the logistic gives P ≈ 95% for a student at 96% of max with margin > 20, that's correct. If it gives P ≈ 80%, that's also correct — it means sigma is wide because of genuine uncertainty.

### Priority 2: Use fraction-of-max scaling instead of hardcoded ratios
```js
// Instead of:
const structuralScale = (fType === 'BFIA') ? (4/3) : 1.0;

// Use:
const max25 = formulaTheoreticalMax(formula25, 2025);
const max26 = formulaTheoreticalMax(formula26, 2026);
const fractionOfMax = cutoff2025 / max25;
const scaledCutoff = fractionOfMax * max26;
```

### Priority 3: Unify k-derivation
```js
// Use Claude's mathematically derived version:
const LN3 = 1.09861228867;
const k = LN3 / sigma;
// P(+σ) = 75%, P(0) = 50%, P(-σ) = 25%
```

### Priority 4: Add ceiling dampening to competition drift
When cutoffs are already near 95% of max, competition growth can't push them higher linearly:
```js
const ceilingDampen = Math.max(0, 1 - Math.max(0, fractionOfMax - 0.90) / 0.10);
const effectiveElasticity = elasticity * ceilingDampen;
```

### Priority 5: Surface confidence prominently
Show confidence as a separate metric on every prediction card, not just in the API response.

---

## FINAL VERDICT

Your engine is **structurally superior** to Claude's because it's universal and handles 1,526 programs across 20 formula types. Claude's engine is **mathematically cleaner** in its probability derivation and sigma handling.

The ideal engine combines:
- **Your composite.js** (universal formula handling) ✅ keep as-is
- **Your engine.js** (batch processing, eligible programs) ✅ keep as-is
- **Your cuet2026.js** (NTA data) ✅ keep as-is
- **Claude's probability math** (pure logistic, no floors, ln(3)/σ) → adopt
- **Claude's fraction-of-max scaling** (robust to formula changes) → adopt
- **Your top-density premium** (reduced coefficient) → keep with tuning
- **Your seat-scarcity sharpening** → keep
- **Your what-if slider** → keep
- **Your AIR calculator** → keep
