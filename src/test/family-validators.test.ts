import { describe, it, expect } from 'vitest';
import { validateSpouseGender } from '@/lib/tree/family-validators';

describe('validateSpouseGender', () => {
  it('rejects two males', () => {
    const result = validateSpouseGender('M', 'M');
    expect(result.valid).toBe(false);
  });

  it('rejects two females', () => {
    const result = validateSpouseGender('F', 'F');
    expect(result.valid).toBe(false);
  });

  it('allows male and female', () => {
    expect(validateSpouseGender('M', 'F').valid).toBe(true);
  });

  it('allows female and male', () => {
    expect(validateSpouseGender('F', 'M').valid).toBe(true);
  });

  it('allows unknown sex for anchor', () => {
    expect(validateSpouseGender(null, 'M').valid).toBe(true);
    expect(validateSpouseGender(null, 'F').valid).toBe(true);
  });

  it('allows unknown sex for selected', () => {
    expect(validateSpouseGender('M', null).valid).toBe(true);
    expect(validateSpouseGender('F', null).valid).toBe(true);
  });

  it('allows both unknown', () => {
    expect(validateSpouseGender(null, null).valid).toBe(true);
  });
});
