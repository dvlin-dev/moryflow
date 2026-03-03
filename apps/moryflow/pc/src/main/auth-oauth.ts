/**
 * [PROVIDES]: OAuth deep link 解析（code/nonce）
 * [DEPENDS]: WHATWG URL
 * [POS]: Main process OAuth 回流解析工具
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

export const getMoryflowDeepLinkScheme = (): string => {
  const scheme = process.env.MORYFLOW_DEEP_LINK_SCHEME?.trim().toLowerCase();
  return scheme || DEFAULT_DEEP_LINK_SCHEME;
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
