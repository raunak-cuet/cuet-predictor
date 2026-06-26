// =====================================================================
// COMPOSITE SCORE ENGINE
// Computes the program-specific merit score given a student's
// per-subject NTA scores, according to DU 2026 eligibility rules.
// =====================================================================

import { LANGUAGES, DOMAINS, COMMERCE_CODES } from './subjects.js';

const LANG_CODES = LANGUAGES.map(s => s.code);
const DOMAIN_CODES = DOMAINS.map(s => s.code);

// Pick the best score from a list of codes the student has actually taken.
function bestOf(scores, codeList) {
  let best = null;
  for (const c of codeList) {
    const v = scores[c];
    if (typeof v === 'number' && (best === null || v > best.score)) {
      best = { code: c, score: v };
    }
  }
  return best;
}

// Pick the best-k subjects from a candidate list.
function bestK(scores, codeList, k) {
  const have = codeList
    .map(c => ({ code: c, score: scores[c] }))
    .filter(x => typeof x.score === 'number')
    .sort((a, b) => b.score - a.score);
  return have.slice(0, k);
}

// Subtract a code from a list.
const without = (list, code) => list.filter(c => c !== code);
const withoutMany = (list, codes) => list.filter(c => !codes.includes(c));

// =====================================================================
// MAIN: computeComposite(formula, scores)
// Returns: { composite, used: [{code,score,role}], eligible, reason }
// composite is null when ineligible (missing required subjects).
// =====================================================================

export function computeComposite(formula, scores) {
  const fType = formula.type;
  const used = [];

  const pushLang = () => {
    const b = bestOf(scores, LANG_CODES);
    if (!b) return null;
    used.push({ code: b.code, score: b.score, role: 'Language' });
    return b;
  };
  const pushFixed = (code, role) => {
    const v = scores[code];
    if (typeof v !== 'number') return null;
    used.push({ code, score: v, role });
    return { code, score: v };
  };

  let lang, m;
  switch (fType) {

    // -------- BFIA / BMS / BBE (1 Lang + Math + 1 Domain + GAT) --------
    case 'BFIA':
    case 'BMS_BBE': {
      lang = pushLang();                       if (!lang) return ineligible('No language taken');
      m    = pushFixed('319', 'Mathematics');  if (!m)    return ineligible('Mathematics is required');
      const dom = bestOf(scores, without(DOMAIN_CODES, '319'));
      if (!dom) return ineligible('At least one non-Math domain subject is required');
      used.push({ code: dom.code, score: dom.score, role: 'Best Domain (excl. Math)' });
      const g = pushFixed('501', 'GAT');       if (!g) return ineligible('General Aptitude Test (GAT) is required');
      return sum(used);
    }

    // -------- B.Com (Hons.) / B.Com Prog. --------
    // Real DU 2026 rule: 1 Language + (Math OR Acc) + 2 best of any other List B subjects.
    // This is the *correct* CUET formula — wider than just Acc/BSt/Eco/Math.
    case 'BCOM_HONS':
    case 'BCOM_PROG': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      // Anchor subject: Math (319) OR Accountancy (301)
      const anchor = bestOf(scores, ['319', '301']);
      if (!anchor) return ineligible('Need Mathematics OR Accountancy');
      used.push({ code: anchor.code, score: anchor.score, role: anchor.code === '319' ? 'Mathematics' : 'Accountancy' });
      // Best 2 of any remaining List B subjects
      const remaining = without(DOMAIN_CODES, anchor.code);
      const k2 = bestK(scores, remaining, 2);
      if (k2.length < 2) return ineligible('Need 2 more domain subjects');
      k2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.Sc (Hons.) Physics / Chemistry / Polymer Science --------
    // DU 2026: Physics + Chemistry + Mathematics. Merit from 3 subjects only (out of 750).
    // Student MUST also have a language in CUET (eligibility req, not in merit).
    case 'BSC_PCM': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const c = pushFixed('306', 'Chemistry');   if (!c) return ineligible('Chemistry required');
      const mm= pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      return sum(used);
    }

    // -------- B.Sc (Hons.) Mathematics / Statistics / Computer Science / Prog. Mathematical Sciences --------
    // DU 2026: 1 Language + Mathematics + 2 best other Domain subjects. Out of 1000.
    // All three formula types share the identical rule — collapsed into a single
    // fall-through to eliminate duplication risk (per code-review recommendation).
    case 'BSC_MATH_STATS':
    case 'BSC_CS':
    case 'BSC_MATH_SCI': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const mm = pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      const k2 = bestK(scores, without(DOMAIN_CODES, '319'), 2);
      if (k2.length < 2) return ineligible('Need 2 more domain subjects besides Mathematics');
      k2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.Sc (Hons.) Biological Sciences / Botany / Zoology / Biomedical / Microbiology --------
    // DU 2026: Physics + Chemistry + Biology. Merit from 3 subjects only (out of 750).
    // NOTE: Per DU 2026 criteria, these are strictly P+C+Bio (no Math option).
    case 'BSC_BIO': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p   = pushFixed('322', 'Physics');   if (!p)   return ineligible('Physics required');
      const c   = pushFixed('306', 'Chemistry'); if (!c)   return ineligible('Chemistry required');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      return sum(used);
    }

    // -------- B.Sc (Hons.) Bio-Chemistry --------
    // DU 2026: Chemistry + Biology + Physics OR Chemistry + Biology + Mathematics. Out of 750.
    case 'BSC_BIOCHEM': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const c   = pushFixed('306', 'Chemistry'); if (!c)   return ineligible('Chemistry required');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      const third = bestOf(scores, ['322', '319']);
      if (!third) return ineligible('Physics or Mathematics required');
      used.push({ code: third.code, score: third.score, role: 'Physics or Mathematics' });
      return sum(used);
    }

    // -------- B.Sc (Hons.) Electronics / Instrumentation --------
    // DU 2026: Physics + Math + Chemistry OR Physics + Math + CS. Out of 750.
    case 'BSC_ELEC_INSTRU': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p  = pushFixed('322', 'Physics');      if (!p)  return ineligible('Physics required');
      const mm = pushFixed('319', 'Mathematics');  if (!mm) return ineligible('Mathematics required');
      const third = bestOf(scores, ['306', '308']);
      if (!third) return ineligible('Chemistry or Computer Science required');
      used.push({ code: third.code, score: third.score, role: 'Chemistry or CS' });
      return sum(used);
    }

    // -------- B.Sc (Prog.) Physical Science with Chemistry / Industrial Chemistry / Analytical Methods --------
    // DU 2026: Physics + Mathematics + Chemistry. Out of 750.
    case 'BSC_PHYSICAL_CHEM': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p  = pushFixed('322', 'Physics');      if (!p)  return ineligible('Physics required');
      const mm = pushFixed('319', 'Mathematics');  if (!mm) return ineligible('Mathematics required');
      const c  = pushFixed('306', 'Chemistry');    if (!c)  return ineligible('Chemistry required');
      return sum(used);
    }

    // -------- B.Sc (Prog.) Physical Science with Electronics / CS --------
    // DU 2026: Physics + Math + Chemistry OR Physics + Math + CS. Out of 750.
    case 'BSC_PHYSICAL_PROG': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p  = pushFixed('322', 'Physics');      if (!p)  return ineligible('Physics required');
      const mm = pushFixed('319', 'Mathematics');  if (!mm) return ineligible('Mathematics required');
      const third = bestOf(scores, ['306', '308']);
      if (!third) return ineligible('Chemistry or Computer Science required');
      used.push({ code: third.code, score: third.score, role: 'Chemistry or CS' });
      return sum(used);
    }

    // -------- B.Sc (Hons.) Environmental Science / Food Technology --------
    // DU 2026: P+C+Bio OR P+C+M. Out of 750.
    case 'BSC_ENV_FOOD': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const c = pushFixed('306', 'Chemistry');   if (!c) return ineligible('Chemistry required');
      const third = bestOf(scores, ['304', '319']);
      if (!third) return ineligible('Biology or Mathematics required');
      used.push({ code: third.code, score: third.score, role: 'Biology or Mathematics' });
      return sum(used);
    }

    // -------- B.Sc (Hons.) Geology --------
    // DU 2026: P+C+M OR P+C+Geography OR P+C+Bio. Out of 750.
    case 'BSC_GEOLOGY': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const c = pushFixed('306', 'Chemistry');   if (!c) return ineligible('Chemistry required');
      const third = bestOf(scores, ['319', '313', '304']);
      if (!third) return ineligible('Mathematics, Geography, or Biology required');
      used.push({ code: third.code, score: third.score, role: 'Math/Geography/Biology' });
      return sum(used);
    }

    // -------- B.Sc (Hons.) Polymer Science --------
    // DU 2026: Physics + Chemistry + Mathematics. Out of 750.
    // (Same as BSC_PCM but listed separately for clarity)
    case 'BSC_POLYMER': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p  = pushFixed('322', 'Physics');      if (!p)  return ineligible('Physics required');
      const c  = pushFixed('306', 'Chemistry');    if (!c)  return ineligible('Chemistry required');
      const mm = pushFixed('319', 'Mathematics');  if (!mm) return ineligible('Mathematics required');
      return sum(used);
    }

    // -------- B.Sc (Hons.) Home Science --------
    // DU 2026: Biology + Physics + any 1 other Domain OR Biology + Chemistry + any 1 other Domain. Out of 750.
    case 'BSC_HS': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      // Pick best anchor: Physics or Chemistry
      const anchor = bestOf(scores, ['322', '306']);
      if (!anchor) return ineligible('Physics or Chemistry required');
      used.push({ code: anchor.code, score: anchor.score, role: anchor.code === '322' ? 'Physics' : 'Chemistry' });
      // Best 1 remaining domain (excluding bio and the anchor)
      const remaining = withoutMany(DOMAIN_CODES, ['304', anchor.code]);
      const k1 = bestK(scores, remaining, 1);
      if (k1.length < 1) return ineligible('Need 1 more domain subject');
      k1.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.Sc (Hons.) Anthropology --------
    // DU 2026: Physics + Chemistry + Biology. Out of 750.
    case 'BSC_ANTHRO': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p   = pushFixed('322', 'Physics');   if (!p)   return ineligible('Physics required');
      const c   = pushFixed('306', 'Chemistry'); if (!c)   return ineligible('Chemistry required');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      return sum(used);
    }

    // -------- B.Sc (Prog.) Life Science / Applied Life Science --------
    // DU 2026: Chemistry + Physics + Biology. Out of 750.
    case 'BSC_LIFE': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const c   = pushFixed('306', 'Chemistry'); if (!c)   return ineligible('Chemistry required');
      const p   = pushFixed('322', 'Physics');   if (!p)   return ineligible('Physics required');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      return sum(used);
    }

    // -------- B.A. (Hons.) Economics / Mathematics  (1 Lang + Math + 2 best Domain) --------
    case 'BA_ECO':
    case 'BA_MATH': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const mm = pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      const k2 = bestK(scores, without(DOMAIN_CODES, '319'), 2);
      if (k2.length < 2) return ineligible('Need 2 more domain subjects besides Mathematics');
      k2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.A. (Hons.) English  (English + 3 best Domain) --------
    case 'BA_ENG': {
      const e = pushFixed('101', 'English'); if (!e) return ineligible('English required');
      const k3 = bestK(scores, DOMAIN_CODES, 3);
      if (k3.length < 3) return ineligible('Need 3 domain subjects');
      k3.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }
    case 'BA_HINDI': {
      const h = pushFixed('102', 'Hindi'); if (!h) return ineligible('Hindi required');
      const k3 = bestK(scores, DOMAIN_CODES, 3);
      if (k3.length < 3) return ineligible('Need 3 domain subjects');
      k3.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }
    case 'BA_SANSKRIT': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const k3 = bestK(scores, DOMAIN_CODES, 3);
      if (k3.length < 3) return ineligible('Need 3 domain subjects');
      k3.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.A. (Hons.) generic / B.Voc / B.El.Ed / Journalism --------
    case 'BA_HONS_GEN':
    case 'BSC_GENERIC':
    case 'BVOC':
    case 'BELED':
    case 'JOURN':
    case 'GENERIC': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const k3 = bestK(scores, DOMAIN_CODES, 3);
      if (k3.length < 3) return ineligible('Need 3 domain subjects');
      k3.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }

    // -------- B.Sc (Pass) Home Science --------
    // DU 2026: Best of (1L+3D | 2L+2D | 1L+1D+GAT). Same as BA_PROG.
    case 'BSC_HS_PASS': {
      return computeBestOfCombos(scores);
    }

    // -------- B.A. (Program) — best of (1L+3D | 2L+2D | 1L+1D+GAT) --------
    case 'BA_PROG': {
      return computeBestOfCombos(scores);
    }

    // -------- B.Tech IT & MI --------
    // DU 2026: 1 Language + Mathematics + GAT. Out of 750.
    case 'BTECH_IT': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const mm = pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      const g  = pushFixed('501', 'GAT');          if (!g)  return ineligible('GAT is required');
      return sum(used);
    }

    // -------- B.A. (Hons.) Multimedia / Mass Communication --------
    // DU 2026: 1 Language + 1 Domain + GAT. Out of 750.
    case 'BA_MMMC': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const d = bestOf(scores, DOMAIN_CODES);
      if (!d) return ineligible('At least one domain subject required');
      used.push({ code: d.code, score: d.score, role: 'Best Domain' });
      const g = pushFixed('501', 'GAT');  if (!g) return ineligible('GAT is required');
      return sum(used);
    }

    default: {
      // Fallback safe path
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const k3 = bestK(scores, DOMAIN_CODES, 3);
      if (k3.length < 3) return ineligible('Need 3 domain subjects');
      k3.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
      return sum(used);
    }
  }
}

// -------- BA_PROG / BSC_HS_PASS helper --------
function computeBestOfCombos(scores) {
  const opt1 = (() => {
    const L = bestOf(scores, LANG_CODES);
    const D = bestK(scores, DOMAIN_CODES, 3);
    if (!L || D.length < 3) return null;
    const used = [{ code: L.code, score: L.score, role: 'Language' }];
    D.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
    return sum(used);
  })();
  const opt2 = (() => {
    const L2 = bestK(scores, LANG_CODES, 2);
    const D2 = bestK(scores, DOMAIN_CODES, 2);
    if (L2.length < 2 || D2.length < 2) return null;
    const used = [];
    L2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Language' }));
    D2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best Domain' }));
    return sum(used);
  })();
  const opt3 = (() => {
    const L = bestOf(scores, LANG_CODES);
    const D = bestOf(scores, DOMAIN_CODES);
    const G = scores['501'];
    if (!L || !D || typeof G !== 'number') return null;
    const used = [
      { code: L.code, score: L.score, role: 'Language' },
      { code: D.code, score: D.score, role: 'Best Domain' },
      { code: '501', score: G, role: 'GAT' }
    ];
    return sum(used);
  })();
  const opts = [opt1, opt2, opt3].filter(x => x && x.eligible);
  if (!opts.length) return ineligible('Need 1L+3D OR 2L+2D OR 1L+1D+GAT');
  opts.sort((a,b) => (b.composite / b.outOf) - (a.composite / a.outOf));
  return opts[0];
}

function sum(used) {
  const composite = used.reduce((a, b) => a + b.score, 0);
  return {
    composite: Math.round(composite * 10000) / 10000,
    outOf: used.length * 250,
    used,
    eligible: true
  };
}
function ineligible(reason) {
  return { composite: null, outOf: null, used: [], eligible: false, reason };
}
