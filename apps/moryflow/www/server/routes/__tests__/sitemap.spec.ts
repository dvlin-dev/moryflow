import { describe, it, expect } from 'vitest';
import handler from '../sitemap.xml';

describe('sitemap route', () => {
  it('renders known routes with www host', async () => {
    const response = await handler({} as never);
    const body = await response.text();
    expect(body).toContain('<loc>https://www.moryflow.com/</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/features</loc>');
    expect(body).toContain('<loc>https://www.moryflow.com/download</loc>');
  });
});
