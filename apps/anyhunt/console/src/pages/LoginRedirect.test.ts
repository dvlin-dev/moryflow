/**
 * 登录重定向死循环回归测试
 * - 以前：SSO 回跳到 console `/login`，而 `/login` 永远重定向到 anyhunt.app/login，导致死循环
 * - 现在：强制将回跳目标从 `/login` 规整到 `/`（或 next 指定的受保护路由）
 */
import { describe, expect, it } from 'vitest';
import {
  buildUnifiedLoginUrl,
  resolveLoginRedirectTarget,
  sanitizeNextPath,
} from './loginRedirect.utils';

describe('LoginRedirect', () => {
  it('sanitizeNextPath 应阻止回跳到 /login（避免死循环）', () => {
    expect(sanitizeNextPath(null)).toBe('/');
    expect(sanitizeNextPath(undefined)).toBe('/');
    expect(sanitizeNextPath('/login')).toBe('/');
    expect(sanitizeNextPath('/login?next=%2F')).toBe('/');
    expect(sanitizeNextPath('/login#hash')).toBe('/');
  });

  it('sanitizeNextPath 应阻止非相对路径与 protocol-relative URL', () => {
    expect(sanitizeNextPath('https://evil.com')).toBe('/');
    expect(sanitizeNextPath('//evil.com')).toBe('/');
  });

  it('resolveLoginRedirectTarget 应从 next 解析回跳 URL', () => {
    const { nextPath, returnToUrl } = resolveLoginRedirectTarget(
      'https://console.anyhunt.app/login?next=%2Ffetchx%2Fscrape%3Fa%3D1'
    );
    expect(nextPath).toBe('/fetchx/scrape?a=1');
    expect(returnToUrl).toBe('https://console.anyhunt.app/fetchx/scrape?a=1');
  });

  it('resolveLoginRedirectTarget 在缺省 next 时应回跳到 /（而不是 /login）', () => {
    const { nextPath, returnToUrl } = resolveLoginRedirectTarget(
      'https://console.anyhunt.app/login'
    );
    expect(nextPath).toBe('/');
    expect(returnToUrl).toBe('https://console.anyhunt.app/');
  });

  it('buildUnifiedLoginUrl 在生产环境应指向 anyhunt.app/login', () => {
    const url = buildUnifiedLoginUrl({
      isDev: false,
      returnToUrl: 'https://console.anyhunt.app/fetchx/scrape',
    });
    expect(url).toBe(
      'https://anyhunt.app/login?redirect=https%3A%2F%2Fconsole.anyhunt.app%2Ffetchx%2Fscrape'
    );
  });

  it('buildUnifiedLoginUrl 在开发环境应指向本地 www/login', () => {
    const url = buildUnifiedLoginUrl({
      isDev: true,
      wwwPort: '3001',
      returnToUrl: 'http://localhost:5173/fetchx/scrape',
    });
    expect(url).toBe(
      'http://localhost:3001/login?redirect=http%3A%2F%2Flocalhost%3A5173%2Ffetchx%2Fscrape'
    );
  });
});
