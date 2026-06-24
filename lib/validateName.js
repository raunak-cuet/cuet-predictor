// =====================================================================
// Name validation — robust against keyboard mashing and placeholder spam.
// Returns { ok: boolean, reason?: string }
// =====================================================================

export function validateName(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: 'Name is required' };
  const name = raw.trim();

  // Length sanity
  if (name.length < 4)  return { ok: false, reason: 'Please enter your full name (at least 4 letters)' };
  if (name.length > 60) return { ok: false, reason: 'Name is too long' };

  // Only letters and spaces
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return { ok: false, reason: 'Use letters and spaces only (no numbers or symbols)' };
  }

  const lower   = name.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  const words   = lower.split(/\s+/).filter(Boolean);

  if (compact.length < 4) {
    return { ok: false, reason: 'Please enter your full name (at least 4 letters)' };
  }

  // Must contain at least one vowel
  if (!/[aeiou]/.test(compact)) {
    return { ok: false, reason: "That doesn't look like a real name" };
  }

  // Per-word structural checks (real names don't have 3 vowels in a row
  // or 5 consonants in a row within a single word)
  for (const word of words) {
    if (/(.)\1{2,}/.test(word)) {
      return { ok: false, reason: "That doesn't look like a real name" };
    }
    if (/[aeiou]{3,}/.test(word)) {
      return { ok: false, reason: 'Please enter your real name' };
    }
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(word)) {
      return { ok: false, reason: 'Please enter your real name' };
    }
  }

  // Vowel ratio: real names land between 20% and 65% vowels.
  // "wajioojaoiwdjoiawjio" has too many vowels (62%+ with weird pattern → caught above).
  // Random consonant mashing has too few.
  const vowelCount = (compact.match(/[aeiou]/g) || []).length;
  const ratio = vowelCount / compact.length;
  if (compact.length >= 6 && (ratio < 0.20 || ratio > 0.65)) {
    return { ok: false, reason: 'Please enter your real name' };
  }

  // Known keyboard-mashing patterns
  const keyboardPatterns = [
    'qwert', 'qwer', 'wert', 'asdf', 'asdfg', 'zxcv', 'zxcvb',
    'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm',
    'awd', 'adwa', 'awad', 'dwad', 'wdwd', 'adsa',
    'sdsd', 'fdsa', 'gfds', 'hjkl', 'qweqwe', 'asdas',
    'vbnm', 'vbn',
    'jio', 'oij', 'wji', 'jwi', 'iwd', 'wdj', 'djo', 'oja'
  ];
  for (const p of keyboardPatterns) {
    if (compact.includes(p)) {
      return { ok: false, reason: 'Please enter your real name' };
    }
  }

  // Repeated trigram: any 3-char sequence appearing twice in the input
  // (e.g. "wjio" appearing again later → mashing pattern)
  for (let i = 0; i < compact.length - 5; i++) {
    const trigram = compact.slice(i, i + 3);
    if (compact.indexOf(trigram, i + 3) !== -1) {
      return { ok: false, reason: 'Please enter your real name' };
    }
  }

  // Common placeholder / test names
  const placeholders = [
    'test', 'testing', 'sample', 'demo', 'admin', 'user',
    'aaaa', 'bbbb', 'cccc', 'xxxx', 'yyyy', 'zzzz', 'abcd', 'abcde',
    'foo', 'foobar', 'bar', 'baz', 'qux', 'lorem', 'ipsum', 'dummy', 'fake',
    'name', 'myname', 'hello', 'hii', 'hey',
    'anonymous', 'anon', 'student', 'random', 'noname',
    'car', 'bus', 'cat', 'dog', 'pet'
  ];
  if (placeholders.includes(lower) || placeholders.includes(compact)) {
    return { ok: false, reason: 'Please enter your real name (not a placeholder)' };
  }

  // Unique character diversity — longer names should use more distinct letters
  const uniqueChars = new Set(compact).size;
  if (compact.length >= 5 && uniqueChars < 3) {
    return { ok: false, reason: "That doesn't look like a real name" };
  }
  if (compact.length >= 10 && uniqueChars < 5) {
    return { ok: false, reason: 'Please enter your real name' };
  }

  return { ok: true };
}
