import { describe, expect, it } from 'vitest';
import { isAdminEmail } from '../better-auth';

describe('isAdminEmail', () => {
  it('returns false when ADMIN_EMAILS is empty', () => {
    expect(isAdminEmail('dvlindev@qq.com', '')).toBe(false);
    expect(isAdminEmail('dvlindev@qq.com', undefined)).toBe(false);
  });

  it('matches emails case-insensitively with trimming', () => {
    const raw = ' dvlindev@qq.com ,Other@Example.com ';
    expect(isAdminEmail('DVLINDEV@QQ.COM', raw)).toBe(true);
    expect(isAdminEmail('other@example.com', raw)).toBe(true);
  });

  it('returns false for empty email input', () => {
    expect(isAdminEmail('', 'dvlindev@qq.com')).toBe(false);
    expect(isAdminEmail(undefined, 'dvlindev@qq.com')).toBe(false);
  });
});
