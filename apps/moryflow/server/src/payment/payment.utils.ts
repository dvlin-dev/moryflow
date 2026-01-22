/**
 * [PROVIDES]: 支付回调与产品解析工具
 * [DEPENDS]: common/utils/origin
 * [POS]: PaymentController/PaymentWebhookController/PaymentSuccessController 复用逻辑
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { isOriginAllowed } from '../common/utils';

export function resolveSuccessUrl(
  inputUrl: string | undefined,
  baseUrl: string,
  allowedOrigins: string[],
): string {
  const base = new URL(baseUrl);
  const fallbackUrl = new URL('/payment/success', base).toString();
  const origins =
    allowedOrigins.length > 0
      ? Array.from(new Set([...allowedOrigins, base.origin]))
      : [base.origin];

  if (!inputUrl) {
    return fallbackUrl;
  }

  const resolved = inputUrl.startsWith('/')
    ? new URL(inputUrl, base)
    : new URL(inputUrl);

  if (!['http:', 'https:'].includes(resolved.protocol)) {
    throw new Error('Invalid successUrl protocol');
  }

  if (!isOriginAllowed(resolved.origin, origins)) {
    throw new Error('Untrusted successUrl origin');
  }

  return resolved.toString();
}

export function resolveCheckoutProductType(
  productId: string,
  creditPacks: Record<string, number>,
  licenseConfig: Record<
    string,
    { tier: 'standard' | 'pro'; activationLimit: number }
  >,
): 'credits' | 'license' {
  if (!productId) {
    throw new Error('Missing productId');
  }

  if (licenseConfig[productId]) return 'license';
  if (creditPacks[productId]) return 'credits';

  throw new Error('Unknown productId');
}

export function serializeQueryForScript(query: Record<string, string>): string {
  return JSON.stringify(query)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
}

export function resolvePostMessageOrigin(
  allowedOrigins: string[],
  referrer?: string,
  fallbackOrigin?: string,
): string | null {
  if (referrer) {
    try {
      const origin = new URL(referrer).origin;
      if (isOriginAllowed(origin, allowedOrigins)) {
        return origin;
      }
    } catch {
      // ignore invalid referrer
    }
  }

  if (allowedOrigins.length === 1) {
    return allowedOrigins[0];
  }

  if (allowedOrigins.length === 0 && fallbackOrigin) {
    return fallbackOrigin;
  }

  return null;
}
