// =====================================================================
// CUET (UG) 2026 vs 2025 — Global statistics from NTA Press Releases.
// All numbers are taken verbatim from the official press releases.
// These constants drive the projected-cutoff & probability engine.
// =====================================================================

export const POOL = {
  registered:   { 2025: 1354699, 2026: 1568867 },
  appeared:     { 2025: 1071735, 2026: 1164098 },
  testsRegistered: { 2025: 5818608, 2026: 6756327 },
  testsAppeared:   { 2025: 4475444, 2026: 4905176 }
};

// Category-wise appeared (unique candidates)
export const CATEGORY_POOL = {
  UR:   { 2025: 475051, 2026: 498652 },
  OBC:  { 2025: 359264, 2026: 401471 },
  SC:   { 2025: 114751, 2026: 128871 },
  ST:   { 2025:  62354, 2026:  67245 },
  EWS:  { 2025:  60315, 2026:  67859 },
  PwBD: { 2025:   4354, 2026:   5033 }
};

// Subject-level data: highest NTA score, appeared count.
// Reflects difficulty / normalisation shifts between 2025 and 2026.
export const SUBJECT_STATS = {
  '101': { name: 'English',               appeared: { 2025: 814640, 2026: 914653 }, maxScore: { 2025: 241.96, 2026: 244.04 } },
  '102': { name: 'Hindi',                 appeared: { 2025: 121004, 2026: null    }, maxScore: { 2025: 238.06, 2026: null   } },
  '103': { name: 'Assamese',              appeared: { 2025:   1129, 2026: null    }, maxScore: { 2025: 220.00, 2026: null   } },
  '104': { name: 'Bengali',               appeared: { 2025:   1796, 2026: null    }, maxScore: { 2025: 244.00, 2026: null   } },
  '105': { name: 'Gujarati',              appeared: { 2025:     61, 2026: null    }, maxScore: { 2025: 166.00, 2026: null   } },
  '106': { name: 'Kannada',               appeared: { 2025:    225, 2026: null    }, maxScore: { 2025: 232.00, 2026: null   } },
  '107': { name: 'Malayalam',             appeared: { 2025:    406, 2026: null    }, maxScore: { 2025: 238.00, 2026: null   } },
  '108': { name: 'Marathi',               appeared: { 2025:    163, 2026: null    }, maxScore: { 2025: 244.00, 2026: null   } },
  '109': { name: 'Odia',                  appeared: { 2025:    594, 2026: null    }, maxScore: { 2025: 219.00, 2026: null   } },
  '110': { name: 'Punjabi',               appeared: { 2025:    661, 2026: null    }, maxScore: { 2025: 250.00, 2026: null   } },
  '111': { name: 'Tamil',                 appeared: { 2025:   1394, 2026: null    }, maxScore: { 2025: 241.00, 2026: null   } },
  '112': { name: 'Telugu',                appeared: { 2025:    655, 2026: null    }, maxScore: { 2025: 178.00, 2026: null   } },
  '113': { name: 'Urdu',                  appeared: { 2025:   2156, 2026: null    }, maxScore: { 2025: 250.00, 2026: null   } },

  '301': { name: 'Accountancy',           appeared: { 2025: 158751, 2026: null    }, maxScore: { 2025: 249.76, 2026: null   } },
  '302': { name: 'Agriculture',           appeared: { 2025:  36581, 2026: null    }, maxScore: { 2025: 228.40, 2026: null   } },
  '303': { name: 'Anthropology',          appeared: { 2025:   1240, 2026: null    }, maxScore: { 2025: 208.00, 2026: null   } },
  '304': { name: 'Biology',               appeared: { 2025: 339892, 2026: 402844 }, maxScore: { 2025: 249.70, 2026: 249.70 } },
  '305': { name: 'Business Studies',      appeared: { 2025: 176143, 2026: 179145 }, maxScore: { 2025: 250.00, 2026: 249.57 } },
  '306': { name: 'Chemistry',             appeared: { 2025: 570869, 2026: 677609 }, maxScore: { 2025: 247.64, 2026: 248.68 } },
  '307': { name: 'Environmental Science', appeared: { 2025:   8376, 2026: null    }, maxScore: { 2025: 185.00, 2026: null   } },
  '308': { name: 'Computer Science',      appeared: { 2025:  61219, 2026: null    }, maxScore: { 2025: 239.50, 2026: null   } },
  '309': { name: 'Economics',             appeared: { 2025: 190750, 2026: 195583 }, maxScore: { 2025: 244.45, 2026: 249.54 } },
  '312': { name: 'Fine Arts',             appeared: { 2025:  13004, 2026: null    }, maxScore: { 2025: 248.33, 2026: null   } },
  '313': { name: 'Geography',             appeared: { 2025:  69574, 2026: null    }, maxScore: { 2025: 250.00, 2026: null   } },
  '314': { name: 'History',               appeared: { 2025:  98324, 2026: null    }, maxScore: { 2025: 249.60, 2026: null   } },
  '315': { name: 'Home Science',          appeared: { 2025:   8487, 2026: null    }, maxScore: { 2025: 234.33, 2026: null   } },
  '316': { name: 'Knowledge Tradition',   appeared: { 2025:    769, 2026: null    }, maxScore: { 2025: 187.00, 2026: null   } },
  '318': { name: 'Mass Media',            appeared: { 2025:   5267, 2026: null    }, maxScore: { 2025: 204.50, 2026: null   } },
  '319': { name: 'Mathematics',           appeared: { 2025: 351745, 2026: 401527 }, maxScore: { 2025: 243.70, 2026: 242.40 } },
  '320': { name: 'Performing Arts',       appeared: { 2025:   2724, 2026: null    }, maxScore: { 2025: 242.00, 2026: null   } },
  '321': { name: 'Physical Education',    appeared: { 2025:  56002, 2026: null    }, maxScore: { 2025: 219.00, 2026: null   } },
  '322': { name: 'Physics',               appeared: { 2025: 540311, 2026: 647076 }, maxScore: { 2025: 237.00, 2026: 241.23 } },
  '323': { name: 'Political Science',     appeared: { 2025: 123457, 2026: null    }, maxScore: { 2025: 249.60, 2026: null   } },
  '324': { name: 'Psychology',            appeared: { 2025:  26055, 2026: null    }, maxScore: { 2025: 250.00, 2026: null   } },
  '325': { name: 'Sanskrit',              appeared: { 2025:   3915, 2026: null    }, maxScore: { 2025: 244.00, 2026: null   } },
  '326': { name: 'Sociology',             appeared: { 2025:  27348, 2026: null    }, maxScore: { 2025: 245.40, 2026: null   } },

  '501': { name: 'General Aptitude Test', appeared: { 2025: 659757, 2026: 675419 }, maxScore: { 2025: 203.36, 2026: 212.65 } }
};

// 100-percentile counts (best-performance metrics) — top-end density
export const TOP_DENSITY = {
  perc100_in_4subjects: { 2025:    1, 2026:    1 },
  perc100_in_3subjects: { 2025:   17, 2026:   22 },
  perc100_in_2subjects: { 2025:  150, 2026:  180 },
  perc100_in_1subject:  { 2025: 2679, 2026: 3214 },
  topAggregateRank1:    { 2025: 1225.93, 2026: 1232.19 },
  topAggregateRank20:   { 2025: 1176.44, 2026: 1177.65 }
};

// ============================================================
// HELPER: get growth ratios
// ============================================================
export function poolGrowth() {
  return POOL.appeared[2026] / POOL.appeared[2025];           // ~1.0862
}
export function categoryGrowth(cat) {
  const m = { UR:'UR', OBC:'OBC', SC:'SC', ST:'ST', EWS:'EWS', PwBD:'PwBD' };
  const k = m[cat] || 'UR';
  return CATEGORY_POOL[k][2026] / CATEGORY_POOL[k][2025];
}

// Top-end density growth (drives elite-cutoff drift)
export function topDensityGrowth() {
  return TOP_DENSITY.perc100_in_1subject[2026] / TOP_DENSITY.perc100_in_1subject[2025]; // ~1.20
}

// Subject-level normalisation shift: max-score 2026 / max-score 2025.
// Returns 1.0 if 2026 not available.
export function subjectShift(code) {
  const s = SUBJECT_STATS[code];
  if (!s) return 1.0;
  const m25 = s.maxScore[2025];
  const m26 = s.maxScore[2026];
  if (!m25 || !m26) return 1.0;
  return m26 / m25;
}
