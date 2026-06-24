// =====================================================================
// Name validation — catches obvious junk submissions
// Returns { ok: boolean, reason?: string }
// =====================================================================

export function validateName(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: 'Name is required' };
  const name = raw.trim();

  // Length sanity
  if (name.length < 3) return { ok: false, reason: 'Please enter your full name (at least 3 letters)' };
  if (name.length > 60) return { ok: false, reason: 'Name is too long' };

  // Must contain only letters and spaces — no digits, symbols, punctuation
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return { ok: false, reason: 'Use letters and spaces only (no numbers or symbols)' };
  }

  // Must contain at least one vowel
  if (!/[aeiouAEIOU]/.test(name)) {
    return { ok: false, reason: 'That doesn’t look like a real name' };
  }

  // Must not be a single repeated character (e.g., "aaaa", "vv", "xxx")
  if (/^(.)\1+$/.test(name.replace(/\s/g, ''))) {
    return { ok: false, reason: 'That doesn’t look like a real name' };
  }

  // Block keyboard-mashing patterns — common consecutive QWERTY rows
  const lower = name.toLowerCase().replace(/\s/g, '');
  const keyboardPatterns = [
    'qwert', 'qwer', 'wert', 'asdf', 'asdfg', 'zxcv', 'zxcvb',
    'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
    'awd', 'adwa', 'awad', 'dwad', 'wdwd', 'adsa',
    'sdsd', 'fdsa', 'gfds', 'hjkl', 'qweqwe', 'asdas',
    'vbnm', 'vbn'
  ];
  for (const pattern of keyboardPatterns) {
    if (lower.includes(pattern)) {
      return { ok: false, reason: 'Please enter your real name' };
    }
  }

  // Block all-consonant names (no real names exist with zero vowels)
  // Already caught by vowel check above, but double-check first 4 chars
  const first4 = lower.slice(0, 4);
  if (first4.length >= 3 && !/[aeiou]/.test(first4)) {
    return { ok: false, reason: 'Please enter your real name' };
  }

  // Block too few unique characters relative to length (e.g., "aaab", "abab")
  // Real names of length ≥ 4 typically have at least 3 unique characters
  const uniqueChars = new Set(lower.replace(/[^a-z]/g, '')).size;
  if (name.length >= 4 && uniqueChars < 3) {
    return { ok: false, reason: 'That doesn’t look like a real name' };
  }

  // Block obvious test placeholders
  const placeholders = [
    'test', 'testing', 'asdf', 'sample', 'demo', 'admin', 'user',
    'aaa', 'bbb', 'ccc', 'xxx', 'yyy', 'zzz', 'abc', 'abcd', 'abcde',
    'foo', 'bar', 'baz', 'qux', 'lorem', 'ipsum', 'dummy', 'fake',
    'name', 'myname', 'hello', 'hi', 'hii', 'hey',
    'anonymous', 'anon', 'student', 'random'
  ];
  if (placeholders.includes(lower)) {
    return { ok: false, reason: 'Please enter your real name (not a placeholder)' };
  }

  return { ok: true };
}
