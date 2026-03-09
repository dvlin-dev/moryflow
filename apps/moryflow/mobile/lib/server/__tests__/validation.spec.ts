import { describe, expect, it } from 'vitest';
import { PASSWORD_CONFIG, validatePassword } from '../validation';

describe('mobile password validation', () => {
  it('should align the minimum password length with the server contract', () => {
    expect(PASSWORD_CONFIG.MIN_LENGTH).toBe(8);
    expect(validatePassword('1234567')).toEqual({
      valid: false,
      errorKey: 'passwordTooShort',
    });
    expect(validatePassword('12345678')).toEqual({ valid: true });
  });
});
