/**
 * [PROVIDES]: OAuth deep link 解析与日志脱敏工具（code/nonce）
 * [DEPENDS]: WHATWG URL
 * [POS]: Main process OAuth 回流解析工具
 * [UPDATE]: 2026-03-03 - 新增 argv deep link 提取与日志脱敏工具
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type OAuthCallbackPayload = {
  code: string;
  nonce: string;
};

const DEFAULT_DEEP_LINK_SCHEME = 'moryflow';
const OAUTH_HOST = 'auth';
const OAUTH_SUCCESS_PATH = 'success';
const SENSITIVE_QUERY_KEYS = ['code', 'nonce'];

export const getMoryflowDeepLinkScheme = (): string => {
  const scheme = process.env.MORYFLOW_DEEP_LINK_SCHEME?.trim().toLowerCase();
  return scheme || DEFAULT_DEEP_LINK_SCHEME;
};

export const extractDeepLinkFromArgv = (argv: readonly string[]): string | null => {
  const expectedPrefix = `${getMoryflowDeepLinkScheme()}://`;
  for (const candidate of argv) {
    const normalized = candidate.trim();
    if (!normalized) {
      continue;
    }
    if (normalized.toLowerCase().startsWith(expectedPrefix)) {
      return normalized;
    }
  }
  return null;
};

export const redactDeepLinkForLog = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl);
    for (const key of SENSITIVE_QUERY_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

export const parseOAuthCallbackDeepLink = (rawUrl: string): OAuthCallbackPayload | null => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== `${getMoryflowDeepLinkScheme()}:`) {
      return null;
    }

    const path = parsed.pathname.replace(/^\/+/, '');
    if (parsed.host !== OAUTH_HOST || path !== OAUTH_SUCCESS_PATH) {
      return null;
    }

    const code = parsed.searchParams.get('code')?.trim() ?? '';
    const nonce = parsed.searchParams.get('nonce')?.trim() ?? '';
    if (!code || !nonce) {
      return null;
    }

    return { code, nonce };
  } catch {
    return null;
  }
};
