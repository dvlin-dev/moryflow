import { describe, it, expect } from 'vitest';
import handler from '../../../server/routes/robots.txt.get';

describe('robots.txt route', () => {
  it('returns correct content-type and content', async () => {
    const response = (await handler({} as never)) as Response;
    const body = await response.text();

    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(body).toContain('Sitemap: https://moryflow.com/sitemap.xml');
    expect(body).toContain('Disallow: /api/v1/');
    expect(body).toContain('Disallow: /_server/');
    expect(body).toContain('Allow: /');
  });
});
