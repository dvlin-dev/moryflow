import { describe, it, expect } from 'vitest';
import handler from '../robots.txt';

describe('robots route', () => {
  it('includes sitemap entry with www host', async () => {
    const response = await handler({} as never);
    const body = await response.text();
    expect(body).toContain('Sitemap: https://www.moryflow.com/sitemap.xml');
  });
});
