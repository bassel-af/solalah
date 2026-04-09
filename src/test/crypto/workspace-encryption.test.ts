import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  generateWorkspaceKey,
  wrapKey,
  unwrapKey,
  encryptField,
  decryptField,
  encryptFieldNullable,
  decryptFieldNullable,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  WORKSPACE_KEY_LENGTH,
} from '@/lib/crypto/workspace-encryption';
import {
  getMasterKey,
  resetMasterKeyCache,
} from '@/lib/crypto/master-key';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('crypto constants', () => {
  test('IV length is 12 bytes (GCM standard)', () => {
    expect(IV_LENGTH).toBe(12);
  });

  test('auth tag length is 16 bytes', () => {
    expect(AUTH_TAG_LENGTH).toBe(16);
  });

  test('workspace key length is 32 bytes (AES-256)', () => {
    expect(WORKSPACE_KEY_LENGTH).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// generateWorkspaceKey
// ---------------------------------------------------------------------------

describe('generateWorkspaceKey', () => {
  test('returns a Buffer of exactly 32 bytes', () => {
    const key = generateWorkspaceKey();
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  test('returns a different key on each call', () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      keys.add(generateWorkspaceKey().toString('hex'));
    }
    expect(keys.size).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// wrapKey / unwrapKey
// ---------------------------------------------------------------------------

describe('wrapKey / unwrapKey', () => {
  test('round-trips a workspace key through wrap/unwrap', () => {
    const masterKey = randomBytes(32);
    const workspaceKey = generateWorkspaceKey();

    const wrapped = wrapKey(workspaceKey, masterKey);
    const unwrapped = unwrapKey(wrapped, masterKey);

    expect(unwrapped.equals(workspaceKey)).toBe(true);
  });

  test('wrapped output has the expected packed length: iv(12) + authTag(16) + ciphertext(32) = 60 bytes', () => {
    const masterKey = randomBytes(32);
    const workspaceKey = generateWorkspaceKey();

    const wrapped = wrapKey(workspaceKey, masterKey);

    expect(wrapped.length).toBe(12 + 16 + 32);
  });

  test('wrapping the same key twice produces different ciphertexts (random nonce)', () => {
    const masterKey = randomBytes(32);
    const workspaceKey = generateWorkspaceKey();

    const a = wrapKey(workspaceKey, masterKey);
    const b = wrapKey(workspaceKey, masterKey);

    expect(a.equals(b)).toBe(false);
  });

  test('unwrapping with the wrong master key throws', () => {
    const masterKey = randomBytes(32);
    const wrongMasterKey = randomBytes(32);
    const workspaceKey = generateWorkspaceKey();

    const wrapped = wrapKey(workspaceKey, masterKey);

    expect(() => unwrapKey(wrapped, wrongMasterKey)).toThrow();
  });

  test('unwrapping tampered wrapped key throws (auth tag mismatch)', () => {
    const masterKey = randomBytes(32);
    const workspaceKey = generateWorkspaceKey();

    const wrapped = wrapKey(workspaceKey, masterKey);
    // Flip a bit in the ciphertext portion (after iv + authTag)
    const tampered = Buffer.from(wrapped);
    tampered[12 + 16] ^= 0x01;

    expect(() => unwrapKey(tampered, masterKey)).toThrow();
  });

  test('wrapKey throws on non-32-byte master key', () => {
    const workspaceKey = generateWorkspaceKey();
    const badMaster = randomBytes(16);
    expect(() => wrapKey(workspaceKey, badMaster)).toThrow();
  });

  test('wrapKey throws on non-32-byte plaintext key', () => {
    const masterKey = randomBytes(32);
    const badWorkspaceKey = randomBytes(16);
    expect(() => wrapKey(badWorkspaceKey, masterKey)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// encryptField / decryptField
// ---------------------------------------------------------------------------

describe('encryptField / decryptField', () => {
  test('round-trips a simple ASCII string', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'hello world';

    const ciphertext = encryptField(plaintext, key);
    const decrypted = decryptField(ciphertext, key);

    expect(decrypted).toBe(plaintext);
  });

  test('round-trips Arabic strings (الكنية)', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'الكنية';

    const ciphertext = encryptField(plaintext, key);
    const decrypted = decryptField(ciphertext, key);

    expect(decrypted).toBe(plaintext);
  });

  test('round-trips Arabic nasab chains (محمد بن عبد الله)', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'محمد بن عبد الله';

    const ciphertext = encryptField(plaintext, key);
    const decrypted = decryptField(ciphertext, key);

    expect(decrypted).toBe(plaintext);
  });

  test('round-trips empty-ish strings and whitespace', () => {
    const key = generateWorkspaceKey();

    expect(decryptField(encryptField(' ', key), key)).toBe(' ');
    expect(decryptField(encryptField('\n\t', key), key)).toBe('\n\t');
  });

  test('round-trips long strings (2000+ chars)', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'أ'.repeat(2000);

    const ciphertext = encryptField(plaintext, key);
    const decrypted = decryptField(ciphertext, key);

    expect(decrypted).toBe(plaintext);
  });

  test('produces different ciphertext for the same plaintext (nonce randomness)', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'repeatable input';

    const a = encryptField(plaintext, key);
    const b = encryptField(plaintext, key);

    expect(a.equals(b)).toBe(false);
  });

  test('encryptField output starts with iv(12) + authTag(16) header', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'x';

    const ciphertext = encryptField(plaintext, key);

    // For 1 byte of plaintext: 12 (iv) + 16 (tag) + 1 (ciphertext) = 29
    expect(ciphertext.length).toBe(12 + 16 + 1);
  });

  test('nonces across many encrypt calls are unique', () => {
    const key = generateWorkspaceKey();
    const nonces = new Set<string>();

    for (let i = 0; i < 200; i++) {
      const ct = encryptField('same', key);
      nonces.add(ct.subarray(0, 12).toString('hex'));
    }

    expect(nonces.size).toBe(200);
  });

  test('decryptField with tampered ciphertext body throws', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'sensitive data';
    const ciphertext = encryptField(plaintext, key);

    const tampered = Buffer.from(ciphertext);
    tampered[tampered.length - 1] ^= 0x01; // flip last byte of ciphertext body

    expect(() => decryptField(tampered, key)).toThrow();
  });

  test('decryptField with tampered authTag throws', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'sensitive data';
    const ciphertext = encryptField(plaintext, key);

    const tampered = Buffer.from(ciphertext);
    // authTag sits at bytes [12, 28)
    tampered[20] ^= 0xff;

    expect(() => decryptField(tampered, key)).toThrow();
  });

  test('decryptField with tampered iv throws', () => {
    const key = generateWorkspaceKey();
    const plaintext = 'sensitive data';
    const ciphertext = encryptField(plaintext, key);

    const tampered = Buffer.from(ciphertext);
    tampered[0] ^= 0xff; // flip first byte of iv

    expect(() => decryptField(tampered, key)).toThrow();
  });

  test('decryptField with wrong workspace key throws', () => {
    const key = generateWorkspaceKey();
    const wrongKey = generateWorkspaceKey();
    const ciphertext = encryptField('secret', key);

    expect(() => decryptField(ciphertext, wrongKey)).toThrow();
  });

  test('decryptField with truncated buffer throws (no silent fallback)', () => {
    const key = generateWorkspaceKey();
    const ciphertext = encryptField('secret', key);

    const truncated = ciphertext.subarray(0, 10);
    expect(() => decryptField(truncated, key)).toThrow();
  });

  test('encryptField throws on non-32-byte workspace key', () => {
    const badKey = randomBytes(16);
    expect(() => encryptField('x', badKey)).toThrow();
  });

  test('decryptField throws on non-32-byte workspace key', () => {
    const key = generateWorkspaceKey();
    const ciphertext = encryptField('x', key);
    const badKey = randomBytes(16);
    expect(() => decryptField(ciphertext, badKey)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// encryptFieldNullable / decryptFieldNullable
// ---------------------------------------------------------------------------

describe('encryptFieldNullable', () => {
  test('returns null for null input', () => {
    const key = generateWorkspaceKey();
    expect(encryptFieldNullable(null, key)).toBeNull();
  });

  test('returns null for undefined input', () => {
    const key = generateWorkspaceKey();
    expect(encryptFieldNullable(undefined, key)).toBeNull();
  });

  test('returns null for empty string', () => {
    const key = generateWorkspaceKey();
    expect(encryptFieldNullable('', key)).toBeNull();
  });

  test('encrypts non-empty strings', () => {
    const key = generateWorkspaceKey();
    const ct = encryptFieldNullable('محمد', key);
    expect(ct).not.toBeNull();
    expect(Buffer.isBuffer(ct)).toBe(true);
    expect(decryptField(ct as Buffer, key)).toBe('محمد');
  });
});

describe('decryptFieldNullable', () => {
  test('returns null for null input', () => {
    const key = generateWorkspaceKey();
    expect(decryptFieldNullable(null, key)).toBeNull();
  });

  test('decrypts non-null ciphertexts', () => {
    const key = generateWorkspaceKey();
    const ct = encryptField('hello', key);
    expect(decryptFieldNullable(ct, key)).toBe('hello');
  });

  test('throws on tampered non-null ciphertext (no silent fallback)', () => {
    const key = generateWorkspaceKey();
    const ct = encryptField('hello', key);
    const tampered = Buffer.from(ct);
    tampered[tampered.length - 1] ^= 0x01;
    expect(() => decryptFieldNullable(tampered, key)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getMasterKey (env loading + validation)
// ---------------------------------------------------------------------------

describe('getMasterKey', () => {
  const ORIGINAL = process.env.WORKSPACE_MASTER_KEY;

  beforeEach(() => {
    resetMasterKeyCache();
    delete process.env.WORKSPACE_MASTER_KEY;
  });

  afterEach(() => {
    resetMasterKeyCache();
    if (ORIGINAL === undefined) {
      delete process.env.WORKSPACE_MASTER_KEY;
    } else {
      process.env.WORKSPACE_MASTER_KEY = ORIGINAL;
    }
  });

  test('throws when env var is missing', () => {
    expect(() => getMasterKey()).toThrow(/WORKSPACE_MASTER_KEY/);
  });

  test('throws when env var is empty string', () => {
    process.env.WORKSPACE_MASTER_KEY = '';
    expect(() => getMasterKey()).toThrow(/WORKSPACE_MASTER_KEY/);
  });

  test('throws when base64 decodes to fewer than 32 bytes', () => {
    process.env.WORKSPACE_MASTER_KEY = randomBytes(16).toString('base64');
    expect(() => getMasterKey()).toThrow(/32 bytes/);
  });

  test('throws when base64 decodes to more than 32 bytes', () => {
    process.env.WORKSPACE_MASTER_KEY = randomBytes(64).toString('base64');
    expect(() => getMasterKey()).toThrow(/32 bytes/);
  });

  test('returns a 32-byte Buffer when env var is valid', () => {
    const raw = randomBytes(32);
    process.env.WORKSPACE_MASTER_KEY = raw.toString('base64');

    const key = getMasterKey();
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
    expect(key.equals(raw)).toBe(true);
  });

  test('memoizes: second call does not re-read env var', () => {
    const raw = randomBytes(32);
    process.env.WORKSPACE_MASTER_KEY = raw.toString('base64');

    const first = getMasterKey();
    // Now sabotage the env var — memoization should mean the second call still returns the original key
    process.env.WORKSPACE_MASTER_KEY = 'garbage-that-would-fail-validation';
    const second = getMasterKey();

    expect(second.equals(first)).toBe(true);
  });

  test('resetMasterKeyCache forces re-read on next call', () => {
    const rawA = randomBytes(32);
    process.env.WORKSPACE_MASTER_KEY = rawA.toString('base64');
    const first = getMasterKey();

    resetMasterKeyCache();
    const rawB = randomBytes(32);
    process.env.WORKSPACE_MASTER_KEY = rawB.toString('base64');
    const second = getMasterKey();

    expect(first.equals(rawA)).toBe(true);
    expect(second.equals(rawB)).toBe(true);
    expect(first.equals(second)).toBe(false);
  });

  test('does not log the key or include it in thrown errors', () => {
    process.env.WORKSPACE_MASTER_KEY = randomBytes(16).toString('base64');
    try {
      getMasterKey();
      throw new Error('expected getMasterKey to throw');
    } catch (err) {
      const msg = (err as Error).message;
      // Error message must NOT contain the actual (invalid) base64 key material
      expect(msg).not.toContain(process.env.WORKSPACE_MASTER_KEY!);
    }
  });
});
