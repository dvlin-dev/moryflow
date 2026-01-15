/**
 * [PROVIDES]: isAllowedRedirect, getRedirectUrl, ALLOWED_REDIRECT_HOSTS
 * [DEPENDS]: none
 * [POS]: 统一登录重定向验证工具
 */

/** 允许重定向的域名白名单 */
export const ALLOWED_REDIRECT_HOSTS = [
  'aiget.dev',
  'console.aiget.dev',
  'admin.aiget.dev',
  'localhost',
] as const;

/** 默认重定向地址 */
export const DEFAULT_REDIRECT = '/';

/**
 * 验证重定向 URL 是否安全
 */
export function isAllowedRedirect(url: string): boolean {
  // 相对路径始终允许
  if (url.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

/**
 * 解析并验证重定向目标
 */
export function getRedirectUrl(searchRedirect?: string): string {
  if (!searchRedirect) {
    return DEFAULT_REDIRECT;
  }

  if (isAllowedRedirect(searchRedirect)) {
    return searchRedirect;
  }

  // 不安全的重定向，使用默认值（仅在开发环境提示）
  if (import.meta.env.DEV) {
    console.warn(`Blocked unsafe redirect: ${searchRedirect}`);
  }
  return DEFAULT_REDIRECT;
}
