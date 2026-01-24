import { describe, it, expect } from 'vitest';
import { generateMeta, siteConfig } from '../seo';

describe('seo', () => {
  it('uses www host for canonical URLs', () => {
    expect(siteConfig.url).toBe('https://www.moryflow.com');
  });

  it('uses available Open Graph image', () => {
    expect(siteConfig.ogImage).toBe('https://www.moryflow.com/og-image.svg');
  });

  it('builds og:url from the configured base', () => {
    const meta = generateMeta({ title: 'Download', path: '/download' }) as Array<{
      property?: string;
      content?: string;
    }>;
    const ogUrl = meta.find((item) => item.property === 'og:url')?.content;
    expect(ogUrl).toBe('https://www.moryflow.com/download');
  });
});
