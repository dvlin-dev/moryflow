import { describe, it, expect } from 'vitest';
import { SITE_BASE_URL } from '../site-pages';
import { ROBOTS_TXT } from '../../routes/robots[.]txt';

describe('robots.txt content', () => {
  it('SITE_BASE_URL uses canonical non-www domain', () => {
    expect(SITE_BASE_URL).toBe('https://moryflow.com');
    expect(SITE_BASE_URL).not.toContain('www.');
  });

  it('points search engines at the sitemap index only', () => {
    expect(ROBOTS_TXT).toContain('Sitemap: https://moryflow.com/sitemap.xml');
    expect(ROBOTS_TXT).not.toContain('sitemap-pages.xml');
    expect(ROBOTS_TXT).not.toContain('sitemap-blog.xml');
  });
});
