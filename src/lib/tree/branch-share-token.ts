import crypto from 'crypto';

/** Prefix for all branch share tokens */
export const TOKEN_PREFIX = 'brsh_';

/**
 * Generate a cryptographically secure branch share token.
 * Uses 32 bytes of randomness encoded as base64url with the brsh_ prefix.
 */
export function generateShareToken(): string {
  const bytes = crypto.randomBytes(32);
  const body = bytes.toString('base64url');
  return `${TOKEN_PREFIX}${body}`;
}

/**
 * Hash a token for storage using SHA-256.
 * The database stores the hash, not the plaintext token.
 * During redemption, the submitted token is hashed and compared.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
