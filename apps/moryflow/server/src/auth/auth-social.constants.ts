/**
 * [PROVIDES]: OAuth 社交登录桥接常量与运行时配置
 * [DEPENDS]: process.env
 * [POS]: AuthSocial 模块共享配置入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export const AUTH_SOCIAL_PROVIDER_GOOGLE = 'google' as const;
export const AUTH_SOCIAL_EXCHANGE_CODE_BYTES = 32;
export const AUTH_SOCIAL_EXCHANGE_KEY_PREFIX = 'auth:social:exchange';
export const AUTH_SOCIAL_CACHE_CONTROL = 'no-store, must-revalidate';
export const AUTH_SOCIAL_DEFAULT_EXCHANGE_TTL_SECONDS = 120;
export const AUTH_SOCIAL_BRIDGE_HOST = 'auth';
export const AUTH_SOCIAL_BRIDGE_PATH = '/success';
export const AUTH_SOCIAL_DEV_LOOPBACK_PATH = '/auth/success';
const AUTH_SOCIAL_DEV_LOOPBACK_HOSTS = new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  '[::1]',
]);

const parsePositiveInt = (
  raw: string | undefined,
  fallback: number,
): number => {
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

export const getAuthSocialExchangeTtlSeconds = (): number =>
  parsePositiveInt(
    process.env.AUTH_SOCIAL_EXCHANGE_TTL_SECONDS,
    AUTH_SOCIAL_DEFAULT_EXCHANGE_TTL_SECONDS,
  );

export const getMoryflowDeepLinkScheme = (): string => {
  const scheme = process.env.MORYFLOW_DEEP_LINK_SCHEME?.trim().toLowerCase();
  return scheme || 'moryflow';
};

export const normalizeDevLoopbackRedirectUri = (
  rawRedirectUri: string,
): string => {
  const normalized = rawRedirectUri?.trim();
  if (!normalized) {
    throw new Error('Invalid oauth redirect uri');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Invalid oauth redirect uri');
  }

  if (parsed.protocol !== 'http:') {
    throw new Error('Invalid oauth redirect uri');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!AUTH_SOCIAL_DEV_LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('Invalid oauth redirect uri');
  }

  if (!parsed.port || parsed.username || parsed.password) {
    throw new Error('Invalid oauth redirect uri');
  }

  if (parsed.pathname !== AUTH_SOCIAL_DEV_LOOPBACK_PATH || parsed.search) {
    throw new Error('Invalid oauth redirect uri');
  }

  parsed.hash = '';
  return parsed.toString();
};
