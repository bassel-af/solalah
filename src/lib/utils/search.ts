/** All Arabic diacritics characters (tashkeel) as a string — shared with SQL translate() */
export const ARABIC_DIACRITICS_CHARS = '\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652\u0653\u0654\u0655\u0656\u0657\u0658\u0659\u065A\u065B\u065C\u065D\u065E\u065F\u0670';

/**
 * Strip Arabic diacritics (tashkeel) from a string.
 */
export function stripArabicDiacritics(s: string): string {
  return s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Multi-word search matching for Arabic and Latin text.
 * Returns true if every whitespace-delimited token in `query`
 * appears somewhere in `text` (case-insensitive, diacritics-stripped).
 */
export function matchesSearch(text: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normalizedText = stripArabicDiacritics(text);
  const tokens = trimmed.split(/\s+/);

  return tokens.every(token => normalizedText.includes(stripArabicDiacritics(token)));
}
