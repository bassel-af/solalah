import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const RANDOM_LENGTH = 8;

/**
 * Generate a join code with the full slug as prefix and 8 cryptographically
 * random alphanumeric characters.
 *
 * Format: SLUG-XXXXXXXX (e.g., SAEED-FAMILY-4X7KA3B2, السعيد-4X7KA3B2)
 */
export function generateJoinCode(slug: string): string {
  const prefix = slug.toUpperCase();
  const bytes = randomBytes(RANDOM_LENGTH);
  let random = '';
  for (let i = 0; i < RANDOM_LENGTH; i++) {
    random += CHARS[bytes[i] % CHARS.length];
  }
  return `${prefix}-${random}`;
}
