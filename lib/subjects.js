// CUET (UG) 2026 — subjects taxonomy.
// Each entry: { code, name, group: 'LANG' | 'DOMAIN' | 'GAT' }

export const SUBJECTS = [
  // ============= LANGUAGES (List A) =============
  { code: '101', name: 'English',     group: 'LANG' },
  { code: '102', name: 'Hindi',       group: 'LANG' },
  { code: '103', name: 'Assamese',    group: 'LANG' },
  { code: '104', name: 'Bengali',     group: 'LANG' },
  { code: '105', name: 'Gujarati',    group: 'LANG' },
  { code: '106', name: 'Kannada',     group: 'LANG' },
  { code: '107', name: 'Malayalam',   group: 'LANG' },
  { code: '108', name: 'Marathi',     group: 'LANG' },
  { code: '109', name: 'Odia',        group: 'LANG' },
  { code: '110', name: 'Punjabi',     group: 'LANG' },
  { code: '111', name: 'Tamil',       group: 'LANG' },
  { code: '112', name: 'Telugu',      group: 'LANG' },
  { code: '113', name: 'Urdu',        group: 'LANG' },

  // ============= DOMAIN (List B) =============
  { code: '301', name: 'Accountancy / Book Keeping',                                group: 'DOMAIN' },
  { code: '302', name: 'Agriculture',                                                group: 'DOMAIN' },
  { code: '303', name: 'Anthropology',                                               group: 'DOMAIN' },
  { code: '304', name: 'Biology / Biotech / Biochemistry',                           group: 'DOMAIN' },
  { code: '305', name: 'Business Studies',                                           group: 'DOMAIN' },
  { code: '306', name: 'Chemistry',                                                  group: 'DOMAIN' },
  { code: '307', name: 'Environmental Science',                                      group: 'DOMAIN' },
  { code: '308', name: 'Computer Science / Informatics Practices',                   group: 'DOMAIN' },
  { code: '309', name: 'Economics / Business Economics',                             group: 'DOMAIN' },
  { code: '312', name: 'Fine Arts / Visual Arts',                                    group: 'DOMAIN' },
  { code: '313', name: 'Geography / Geology',                                        group: 'DOMAIN' },
  { code: '314', name: 'History',                                                    group: 'DOMAIN' },
  { code: '315', name: 'Home Science',                                               group: 'DOMAIN' },
  { code: '316', name: 'Knowledge Tradition - India',                                group: 'DOMAIN' },
  { code: '318', name: 'Mass Media / Mass Communication',                            group: 'DOMAIN' },
  { code: '319', name: 'Mathematics / Applied Mathematics',                          group: 'DOMAIN' },
  { code: '320', name: 'Performing Arts (Dance/Drama/Music)',                        group: 'DOMAIN' },
  { code: '321', name: 'Physical Education',                                         group: 'DOMAIN' },
  { code: '322', name: 'Physics',                                                    group: 'DOMAIN' },
  { code: '323', name: 'Political Science',                                          group: 'DOMAIN' },
  { code: '324', name: 'Psychology',                                                 group: 'DOMAIN' },
  { code: '325', name: 'Sanskrit',                                                   group: 'DOMAIN' },
  { code: '326', name: 'Sociology',                                                  group: 'DOMAIN' },

  // ============= GENERAL APTITUDE TEST =============
  { code: '501', name: 'General Aptitude Test (GAT)', group: 'GAT' }
];

export const SUBJECT_BY_CODE = Object.fromEntries(SUBJECTS.map(s => [s.code, s]));

export const LANGUAGES = SUBJECTS.filter(s => s.group === 'LANG');
export const DOMAINS   = SUBJECTS.filter(s => s.group === 'DOMAIN');
export const GAT       = SUBJECTS.filter(s => s.group === 'GAT');

// ============= COMMERCE-FAMILY DOMAIN CODES =============
// Used in B.Com (Hons.) / B.Com (Prog) formula: best 3 of these (with Acc or Math as anchor)
export const COMMERCE_CODES = ['301', '305', '309', '319']; // Acc, BSt, Eco, Math

// ============= SCIENCE COMBINATIONS =============
export const PCM_CODES = ['322', '306', '319']; // Physics, Chemistry, Math
export const PCB_CODES = ['322', '306', '304']; // Physics, Chemistry, Biology
