/**
 * [PROVIDES]: fetchWithSsrGuard - SSRF-safe fetch with redirect validation
 * [DEPENDS]: UrlValidator
 * [POS]: Shared HTTP fetch helper for user-provided URLs
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */
import { UrlValidator } from '../validators/url.validator';

export interface SafeFetchOptions extends RequestInit {
  maxRedirects?: number;
}

export async function fetchWithSsrGuard(
  urlValidator: UrlValidator,
  url: string,
  options: SafeFetchOptions = {},
): Promise<Response> {
  const { maxRedirects = 3, ...fetchOptions } = options;
  let currentUrl = url;
  let remaining = maxRedirects;

  while (true) {
    if (!(await urlValidator.isAllowed(currentUrl))) {
      throw new Error(`URL not allowed: ${currentUrl}`);
    }

    const response = await fetch(currentUrl, {
      ...fetchOptions,
      redirect: 'manual',
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) {
      return response;
    }

    if (remaining <= 0) {
      throw new Error('Too many redirects');
    }

    currentUrl = new URL(location, currentUrl).toString();
    remaining -= 1;
  }
}
