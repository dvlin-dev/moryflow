import { describe, expect, it } from 'vitest';
import { isAdminEmail } from '../better-auth';

describe('isAdminEmail', () => {
  it('returns false when ADMIN_EMAILS is empty', () => {
    expect(isAdminEmail('admin@dvlin.com', '')).toBe(false);
    expect(isAdminEmail('admin@dvlin.com', undefined)).toBe(false);
  });

  it('matches emails case-insensitively with trimming', () => {
    const raw = ' admin@dvlin.com ,Other@Example.com ';
    expect(isAdminEmail('ADMIN@DVLIN.COM', raw)).toBe(true);
    expect(isAdminEmail('other@example.com', raw)).toBe(true);
  });

  it('returns false for empty email input', () => {
    expect(isAdminEmail('', 'admin@dvlin.com')).toBe(false);
    expect(isAdminEmail(undefined, 'admin@dvlin.com')).toBe(false);
  });
});
