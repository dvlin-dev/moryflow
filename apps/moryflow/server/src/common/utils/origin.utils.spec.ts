import { describe, it, expect, afterEach } from 'vitest';
import { getAllowedOrigins, isOriginAllowed } from './origin.utils';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getAllowedOrigins', () => {
  it('优先使用 TRUSTED_ORIGINS', () => {
    process.env.TRUSTED_ORIGINS = 'https://trusted.example.com';
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';

    expect(getAllowedOrigins()).toEqual(['https://trusted.example.com']);
  });

  it('TRUSTED_ORIGINS 缺失时使用 ALLOWED_ORIGINS', () => {
    delete process.env.TRUSTED_ORIGINS;
    process.env.ALLOWED_ORIGINS = 'https://allowed.example.com';

    expect(getAllowedOrigins()).toEqual(['https://allowed.example.com']);
  });

  it('无配置时在非生产环境返回默认值', () => {
    delete process.env.TRUSTED_ORIGINS;
    delete process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'development';

    expect(getAllowedOrigins()).toContain('http://localhost:3000');
  });
});

describe('isOriginAllowed', () => {
  it('支持精确匹配与通配符子域名', () => {
    const patterns = ['https://server.moryflow.com', 'https://*.moryflow.com'];

    expect(isOriginAllowed('https://server.moryflow.com', patterns)).toBe(true);
    expect(isOriginAllowed('https://docs.moryflow.com', patterns)).toBe(true);
    expect(isOriginAllowed('https://evil.com', patterns)).toBe(false);
  });
});
