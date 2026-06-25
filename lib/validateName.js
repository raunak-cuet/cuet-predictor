// =====================================================================
// Name Validation — v2
// Robust against keyboard mashing, placeholder spam, and gibberish
// while reducing false negatives for legitimate international names.
// Returns { ok: boolean, reason?: string }
// =====================================================================

// ── Pre-computed Sets for O(1) lookup ──────────────────────────────
const PLACEHOLDER_NAMES = new Set([
  'test', 'testing', 'sample', 'demo', 'admin', 'user',
  'aaaa', 'bbbb', 'cccc', 'xxxx', 'yyyy', 'zzzz', 'abcd', 'abcde',
  'foo', 'foobar', 'bar', 'baz', 'qux', 'lorem', 'ipsum', 'dummy', 'fake',
  'name', 'myname', 'hello', 'hii', 'hey', 'hi',
  'anonymous', 'anon', 'student', 'random', 'noname', 'nobody',
  'car', 'bus', 'cat', 'dog', 'pet',
  'null', 'undefined', 'none', 'nil', 'na',
  'asdf', 'asdfgh', 'qwerty', 'zxcvbn',
  'aaa', 'bbb', 'ccc', 'ddd', 'abc',
]);

const FAKE_FULL_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'mickey mouse', 'donald duck', 'bugs bunny',
  'foo bar', 'test user', 'test name', 'sample name',
  'first last', 'firstname lastname', 'your name',
]);

const KEYBOARD_SEQUENCES = [
  'qwert', 'qwer', 'werty', 'asdf', 'asdfg', 'sdfg', 'dfgh',
  'zxcv', 'zxcvb', 'xcvb', 'cvbn', 'vbnm',
  'fdsa', 'gfds', 'hjkl', 'lkjh',
  'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
  'qweqwe', 'asdas', 'sdsd', 'adad', 'jkjk',
];

export function validateName(raw) {
  // ── 0. Type & emptiness ─────────────────────────────────────────
  if (typeof raw !== 'string') return fail('Name is required');
  const name = raw.trim();
  if (name.length === 0) return fail('Name is required');

  // ── 1. Length bounds ────────────────────────────────────────────
  if (name.length > 80) return fail('Name is too long (max 80 characters)');

  // ── 2. Allowed characters ──────────────────────────────────────
  // Unicode letters, spaces, hyphens, apostrophes, periods
  if (!/^[\p{L}\s'\-\.]+$/u.test(name)) {
    return fail('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  // ── 3. Derived values ──────────────────────────────────────────
  const lower   = name.toLowerCase();
  const compact = lower.replace(/[^a-z\u00C0-\u024F]/g, '');
  const words   = lower.split(/[\s\-]+/).filter(Boolean);

  // ── 4. Minimum letter count ────────────────────────────────────
  if (compact.length < 2) return fail('Name must have at least 2 letters');

  // ── 5. Non-Latin fast path ─────────────────────────────────────
  const isLatinBased = /^[a-z\u00C0-\u024F\s'\-\.]+$/i.test(name);
  if (!isLatinBased) {
    if (/(.)\1{3,}/u.test(name)) return fail("That doesn't look like a real name");
    return ok();
  }

  // ── 6. Must contain at least one vowel (y as semi-vowel) ───────
  if (!/[aeiouy]/.test(compact)) return fail("That doesn't look like a real name");

  // ── 7. Per-word structural checks ──────────────────────────────
  for (const word of words) {
    const clean = word.replace(/[^a-z\u00C0-\u024F]/g, '');
    if (clean.length === 0) continue;

    // 3+ identical consecutive letters
    if (/(.)\1{2,}/.test(clean)) return fail("That doesn't look like a real name");

    // 4+ consecutive vowels
    if (/[aeiouy]{4,}/.test(clean)) return fail('Please enter your real name');

    // 5+ consecutive consonants
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(clean)) return fail('Please enter your real name');
  }

  // ── 8. Vowel ratio ─────────────────────────────────────────────
  if (compact.length >= 6) {
    const vowelCount = (compact.match(/[aeiouy]/g) || []).length;
    const ratio = vowelCount / compact.length;
    if (ratio < 0.15 || ratio > 0.70) return fail('Please enter your real name');
  }

  // ── 9. Keyboard mashing patterns ───────────────────────────────
  for (const seq of KEYBOARD_SEQUENCES) {
    if (compact.includes(seq)) return fail('Please enter your real name');
  }

  // ── 10. Repeated trigram detection (3+ times) ──────────────────
  if (compact.length >= 8) {
    const trigramCounts = new Map();
    for (let i = 0; i <= compact.length - 3; i++) {
      const tri = compact.slice(i, i + 3);
      trigramCounts.set(tri, (trigramCounts.get(tri) || 0) + 1);
    }
    for (const count of trigramCounts.values()) {
      if (count >= 3) return fail('Please enter your real name');
    }
  }

  // ── 11. Placeholder names ──────────────────────────────────────
  if (PLACEHOLDER_NAMES.has(lower) || PLACEHOLDER_NAMES.has(compact)) {
    return fail('Please enter your real name (not a placeholder)');
  }

  // ── 12. Known fake full names ──────────────────────────────────
  if (FAKE_FULL_NAMES.has(lower)) return fail('Please enter your real name');

  // ── 13. Character diversity ────────────────────────────────────
  const uniqueChars = new Set(compact).size;
  if (compact.length >= 5 && uniqueChars < 3) return fail("That doesn't look like a real name");
  if (compact.length >= 10 && uniqueChars < 5) return fail('Please enter your real name');

  return ok();
}

function ok()         { return { ok: true }; }
function fail(reason) { return { ok: false, reason }; }
