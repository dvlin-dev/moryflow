/**
 * [PROVIDES]: OAuth 社交登录桥接常量与运行时配置
 * [DEPENDS]: process.env
 * [POS]: AuthSocial 模块共享配置入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export const AUTH_SOCIAL_PROVIDER_GOOGLE = 'google' as const;
export const AUTH_SOCIAL_EXCHANGE_CODE_BYTES = 32;
export const AUTH_SOCIAL_EXCHANGE_KEY_PREFIX = 'auth:social:exchange';
export const AUTH_SOCIAL_CACHE_CONTROL = 'no-store, must-revalidate';
export const AUTH_SOCIAL_DEFAULT_EXCHANGE_TTL_SECONDS = 120;
export const AUTH_SOCIAL_BRIDGE_HOST = 'auth';
export const AUTH_SOCIAL_BRIDGE_PATH = '/success';

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
  const scheme = process.env.MORYFLOW_DEEP_LINK_SCHEME?.trim();
  return scheme || 'moryflow';
};
