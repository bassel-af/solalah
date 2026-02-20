import { describe, test, expect } from 'vitest';
import { matchesSearch } from '@/lib/utils/search';

describe('matchesSearch', () => {
  test('returns true for empty query, whitespace-only, and blank string', () => {
    expect(matchesSearch('أحمد بن محمد', '')).toBe(true);
    expect(matchesSearch('أحمد بن محمد', '   ')).toBe(true);
    expect(matchesSearch('', '')).toBe(true);
  });

  test('returns true when single token is a substring of the text', () => {
    expect(matchesSearch('أحمد بن محمد سعيد', 'أحمد')).toBe(true);
    expect(matchesSearch('أحمد بن محمد سعيد', 'سعيد')).toBe(true);
    expect(matchesSearch('أحمد بن محمد سعيد', 'بن')).toBe(true);
  });

  test('returns true only when all tokens are present, false if any is missing', () => {
    expect(matchesSearch('أحمد بن محمد سعيد', 'أحمد سعيد')).toBe(true);
    expect(matchesSearch('أحمد بن محمد سعيد', 'أحمد بن محمد سعيد')).toBe(true);
    expect(matchesSearch('أحمد بن محمد سعيد', 'أحمد خالد')).toBe(false);
  });

  test('matches regardless of case', () => {
    expect(matchesSearch('Ahmad ibn Saeed', 'AHMAD')).toBe(true);
    expect(matchesSearch('Ahmad ibn Saeed', 'ahmad ibn saeed')).toBe(true);
    expect(matchesSearch('AHMAD IBN SAEED', 'ahmad')).toBe(true);
  });

  test('returns false when a token does not appear in the text', () => {
    expect(matchesSearch('أحمد بن محمد سعيد', 'خالد')).toBe(false);
    expect(matchesSearch('', 'أحمد')).toBe(false);
    expect(matchesSearch('أحمد بن محمد سعيد', 'أحمد خالد')).toBe(false);
  });
});
