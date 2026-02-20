/**
 * Multi-word search matching for Arabic and Latin text.
 * Returns true if every whitespace-delimited token in `query`
 * appears somewhere in `text` (case-insensitive, diacritics-stripped).
 */
export function matchesSearch(text: string, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const normalize = (s: string): string =>
    s.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '');

  const normalizedText = normalize(text);
  const tokens = trimmed.split(/\s+/);

  return tokens.every(token => normalizedText.includes(normalize(token)));
}
