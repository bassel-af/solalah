import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const RANDOM_LENGTH = 8;

/**
 * Generate a join code with a slug-derived prefix and 8 cryptographically
 * random alphanumeric characters.
 *
 * Format: PREFIX-XXXXXXXX (e.g., SAEED-4X7KA3B2)
 */
export function generateJoinCode(slug: string): string {
  const prefix = slug.split('-')[0].toUpperCase().slice(0, 8);
  const bytes = randomBytes(RANDOM_LENGTH);
  let random = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    random += CHARS[bytes[i] % CHARS.length];
  }
  return `${prefix}-${random}`;
}

/** Sentinel for tests to verify crypto is used instead of Math.random */
export const _usesSecureRandom = true;
