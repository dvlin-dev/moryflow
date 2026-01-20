/**
 * [PROVIDES]: sanitizeNextPath, resolveLoginRedirectTarget, buildUnifiedLoginUrl
 * [DEPENDS]: none
 * [POS]: Console 统一登录跳转工具（纯函数），用于避免 SSO redirect 死循环
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

export function sanitizeNextPath(rawNext: string | null | undefined): string {
  if (!rawNext) return '/';
  if (!rawNext.startsWith('/')) return '/';
  if (rawNext.startsWith('//')) return '/';
  if (rawNext.startsWith('/login')) return '/';
  return rawNext;
}

export function resolveLoginRedirectTarget(currentHref: string): {
  nextPath: string;
  returnToUrl: string;
} {
  const currentUrl = new URL(currentHref);
  const nextPath = sanitizeNextPath(currentUrl.searchParams.get('next'));
  const returnToUrl = new URL(nextPath, currentUrl.origin).toString();
  return { nextPath, returnToUrl };
}

export function buildUnifiedLoginUrl(options: {
  returnToUrl: string;
  isDev: boolean;
  wwwPort?: string;
}): string {
  const encodedReturnTo = encodeURIComponent(options.returnToUrl);

  if (options.isDev) {
    const wwwPort = options.wwwPort || '3001';
    return `http://localhost:${wwwPort}/login?redirect=${encodedReturnTo}`;
  }

  return `https://anyhunt.app/login?redirect=${encodedReturnTo}`;
}
