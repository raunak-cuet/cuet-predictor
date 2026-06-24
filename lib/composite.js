// =====================================================================
// COMPOSITE SCORE ENGINE
// Computes the program-specific merit score (out of 1000) given a
// student's per-subject NTA scores.
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

    // -------- B.Sc (Hons.) Physics / Chemistry / Math / Electronics --------
    // Real DU formula: PHYSICS + CHEMISTRY + MATHEMATICS only (no language in merit).
    // Max = 750. Student MUST also have a language in CUET (we check below).
    case 'BSC_PCM': {
      // Eligibility: must have a language (CUET requirement) but it doesn't count in merit
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const c = pushFixed('306', 'Chemistry');   if (!c) return ineligible('Chemistry required');
      const mm= pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      return sum(used);
    }

    // -------- B.Sc (Hons.) Computer Science --------
    // DU formula: Math + 2 best of (Phy/Chem/CS). Max = 750.
    case 'BSC_CS': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const mm = pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      const k2 = bestK(scores, ['322','306','308'], 2);
      if (k2.length < 2) return ineligible('Need 2 of: Physics, Chemistry, Computer Science');
      k2.forEach(x => used.push({ code: x.code, score: x.score, role: 'Best of Physics/Chem/CS' }));
      return sum(used);
    }

    // -------- B.Sc (Hons.) Biology / Botany / Zoology / Biotech / Biomedical --------
    // DU formula: Biology + Chemistry + (Physics or Mathematics). Max = 750.
    case 'BSC_BIO': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const bio = pushFixed('304', 'Biology');   if (!bio) return ineligible('Biology required');
      const c   = pushFixed('306', 'Chemistry'); if (!c)   return ineligible('Chemistry required');
      const third = bestOf(scores, ['322','319']);
      if (!third) return ineligible('Physics or Mathematics required');
      used.push({ code: third.code, score: third.score, role: 'Physics or Mathematics' });
      return sum(used);
    }

    // -------- B.Sc (Prog.) Physical Sciences --------
    // DU formula: Physics + Chemistry + (Math or CS). Max = 750.
    case 'BSC_PHYSICAL_PROG': {
      const langCheck = bestOf(scores, LANG_CODES);
      if (!langCheck) return ineligible('CUET requires at least 1 language');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const c = pushFixed('306', 'Chemistry');   if (!c) return ineligible('Chemistry required');
      const third = bestOf(scores, ['319','308']);
      if (!third) return ineligible('Mathematics or Computer Science required');
      used.push({ code: third.code, score: third.score, role: 'Math/CS' });
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

    // -------- B.A. (Hons.) generic / B.Sc generic / B.Voc / B.El.Ed / B.Sc (HS) / B.Sc Anthro --------
    case 'BA_HONS_GEN':
    case 'BSC_GENERIC':
    case 'BSC_HS':
    case 'BSC_ANTHRO':
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

    // -------- B.A. (Program) — best of (1L+3D | 2L+2D | 1L+1D+GAT) --------
    case 'BA_PROG': {
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
      // pick highest composite (BA Prog scores are normalised below)
      opts.sort((a,b) => (b.composite / b.outOf) - (a.composite / a.outOf));
      return opts[0];
    }

    // -------- B.Tech IT & MI --------
    case 'BTECH_IT': {
      lang = pushLang(); if (!lang) return ineligible('No language taken');
      const p = pushFixed('322', 'Physics');     if (!p) return ineligible('Physics required');
      const mm = pushFixed('319', 'Mathematics'); if (!mm) return ineligible('Mathematics required');
      const fourth = bestOf(scores, ['308','306']);
      if (!fourth) return ineligible('Computer Science or Chemistry required');
      used.push({ code: fourth.code, score: fourth.score, role: 'CS/Chemistry' });
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
