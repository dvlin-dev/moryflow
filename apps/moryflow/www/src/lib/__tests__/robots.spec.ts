import { describe, it, expect } from 'vitest';
import { SITE_BASE_URL } from '../site-pages';

describe('robots.txt content', () => {
  it('SITE_BASE_URL uses canonical non-www domain', () => {
    expect(SITE_BASE_URL).toBe('https://moryflow.com');
    expect(SITE_BASE_URL).not.toContain('www.');
  });
});
