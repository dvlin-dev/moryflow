import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateUsername, PASSWORD_CONFIG, validatePassword } from '../validation';

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

describe('mobile username generation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps a full 5-digit random suffix', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.12345);

    expect(generateUsername('demo-user@moryflow.com')).toBe('demo-user_12345');
  });
});
