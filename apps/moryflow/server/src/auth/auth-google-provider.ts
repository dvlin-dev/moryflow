/**
 * [INPUT]: process.env.GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
 * [OUTPUT]: Google OAuth provider 配置（或 undefined）
 * [POS]: Auth Google provider 配置事实源（Better Auth 与预检共用）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export type GoogleProviderConfig = {
  clientId: string;
  clientSecret: string;
  prompt: 'select_account';
  scope: ['openid', 'email', 'profile'];
};

const GOOGLE_PROVIDER_SCOPE: GoogleProviderConfig['scope'] = [
  'openid',
  'email',
  'profile',
];

export const readGoogleProviderConfig = ():
  | GoogleProviderConfig
  | undefined => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
    prompt: 'select_account',
    scope: GOOGLE_PROVIDER_SCOPE,
  };
};

export const isGoogleProviderConfigured = (): boolean =>
  Boolean(readGoogleProviderConfig());
