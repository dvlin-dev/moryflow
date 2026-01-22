/**
 * [PROVIDES]: Origin 解析与白名单校验
 * [DEPENDS]: process.env
 * [POS]: 认证/支付回跳等跨域安全校验复用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const DEV_DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

function parseOriginList(raw?: string): string[] {
  return (
    raw
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

/**
 * 获取可信 Origin 列表（TRUSTED_ORIGINS 优先，其次 ALLOWED_ORIGINS）
 */
export function getAllowedOrigins(): string[] {
  const trusted = parseOriginList(process.env.TRUSTED_ORIGINS);
  if (trusted.length > 0) return trusted;

  const allowed = parseOriginList(process.env.ALLOWED_ORIGINS);
  if (allowed.length > 0) return allowed;

  const isDev = process.env.NODE_ENV !== 'production';
  return isDev ? DEV_DEFAULT_ORIGINS : [];
}

/**
 * 判断 Origin 是否匹配白名单（支持通配符子域名）
 */
export function isOriginAllowed(origin: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  return patterns.some((pattern) => matchOrigin(origin, pattern));
}

function matchOrigin(origin: string, pattern: string): boolean {
  if (origin === pattern) return true;

  if (pattern.includes('*')) {
    const regex = new RegExp(
      '^' + pattern.replace(/\./g, '\\.').replace('*', '[a-zA-Z0-9-]+') + '$',
    );
    return regex.test(origin);
  }

  return false;
}
