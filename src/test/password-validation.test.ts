import { describe, it, expect, beforeAll } from 'vitest';
import { passwordStrengthSchema, passwordChangeSchema } from '@/lib/profile/validation';
import { preloadZxcvbn, checkPasswordStrength, isZxcvbnReady, getLoadPromise } from '@/lib/profile/password-strength';

describe('passwordStrengthSchema', () => {
  it('rejects passwords shorter than 8 characters', () => {
    const result = passwordStrengthSchema.safeParse('Ab1cdef');
    expect(result.success).toBe(false);
  });

  it('rejects passwords with no letters', () => {
    const result = passwordStrengthSchema.safeParse('12345678');
    expect(result.success).toBe(false);
  });

  it('rejects passwords with no uppercase letter', () => {
    const result = passwordStrengthSchema.safeParse('mypass12');
    expect(result.success).toBe(false);
  });

  it('rejects passwords with no lowercase letter', () => {
    const result = passwordStrengthSchema.safeParse('MYPASS12');
    expect(result.success).toBe(false);
  });

  it('rejects passwords with no digits', () => {
    const result = passwordStrengthSchema.safeParse('Abcdefgh');
    expect(result.success).toBe(false);
  });

  it('accepts valid passwords', () => {
    const result = passwordStrengthSchema.safeParse('MyStr0ngPw!');
    expect(result.success).toBe(true);
  });

  it('accepts passwords with Arabic letters as lowercase', () => {
    const result = passwordStrengthSchema.safeParse('كلمةA1234');
    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const result = passwordStrengthSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects passwords over 256 characters', () => {
    const longPassword = 'a'.repeat(257) + '1';
    const result = passwordStrengthSchema.safeParse(longPassword);
    expect(result.success).toBe(false);
  });
});

describe('passwordChangeSchema', () => {
  it('rejects when currentPassword is empty', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: '',
      newPassword: 'NewPass12',
      confirmPassword: 'NewPass12',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when newPassword equals currentPassword', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: 'OldPass12',
      confirmPassword: 'OldPass12',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when confirmPassword does not match newPassword', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: 'NewPass12',
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid change with all fields correct', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: 'NewPass12',
      confirmPassword: 'NewPass12',
    });
    expect(result.success).toBe(true);
  });

  it('applies passwordStrengthSchema rules to newPassword', () => {
    // Too short
    const tooShort = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: 'Ab1',
      confirmPassword: 'Ab1',
    });
    expect(tooShort.success).toBe(false);

    // No digits
    const noDigits = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: 'abcdefgh',
      confirmPassword: 'abcdefgh',
    });
    expect(noDigits.success).toBe(false);

    // No letters
    const noLetters = passwordChangeSchema.safeParse({
      currentPassword: 'OldPass12',
      newPassword: '12345678',
      confirmPassword: '12345678',
    });
    expect(noLetters.success).toBe(false);
  });
});

describe('checkPasswordStrength', () => {
  it('isZxcvbnReady returns false before preload', () => {
    expect(isZxcvbnReady()).toBe(false);
  });

  it('returns null before loading', () => {
    const result = checkPasswordStrength('Password1');
    expect(result).toBeNull();
  });

  describe('after loading', () => {
    beforeAll(async () => {
      preloadZxcvbn();
      await getLoadPromise();
    });

    it('loads successfully after preloadZxcvbn', () => {
      expect(isZxcvbnReady()).toBe(true);
    });

    it('scores "Password1" below 3', () => {
      const result = checkPasswordStrength('Password1');
      expect(result).not.toBeNull();
      expect(result!.score).toBeLessThan(3);
    });

    it('scores "Password2" below 3', () => {
      const result = checkPasswordStrength('Password2');
      expect(result).not.toBeNull();
      expect(result!.score).toBeLessThan(3);
    });

    it('scores "Abcd1234" below 3', () => {
      const result = checkPasswordStrength('Abcd1234');
      expect(result).not.toBeNull();
      expect(result!.score).toBeLessThan(3);
    });

    it('scores "Qwerty123" below 3', () => {
      const result = checkPasswordStrength('Qwerty123');
      expect(result).not.toBeNull();
      expect(result!.score).toBeLessThan(3);
    });

    it('scores a strong random password at 3 or above', () => {
      const result = checkPasswordStrength('Tr0ub4dor&3xY!zQ');
      expect(result).not.toBeNull();
      expect(result!.score).toBeGreaterThanOrEqual(3);
    });

    it('returns feedback messages for weak passwords', () => {
      const result = checkPasswordStrength('Password1');
      expect(result).not.toBeNull();
      expect(result!.feedback.length).toBeGreaterThan(0);
    });

    it('penalizes passwords containing userInputs', () => {
      const withoutInputs = checkPasswordStrength('John1234!');
      const withInputs = checkPasswordStrength('John1234!', ['john@example.com']);
      expect(withoutInputs).not.toBeNull();
      expect(withInputs).not.toBeNull();
      expect(withInputs!.score).toBeLessThanOrEqual(withoutInputs!.score);
    });
  });
});
