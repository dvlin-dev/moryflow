/**
 * Welcome API (public)
 *
 * [PROVIDES]: getWelcomeOverview, getWelcomePage
 * [POS]: /welcome 的数据源（服务端可配置，i18n-ready）
 */

import { getPublicApiClient } from '@/lib/public-api-client';
import type { WelcomeOverviewPublic, WelcomePagePublic } from './welcome.types';

function getClientLocale(): string {
  if (typeof window === 'undefined') return 'en';
  return navigator.language || navigator.languages?.[0] || 'en';
}

export async function getWelcomeOverview(apiUrl: string): Promise<WelcomeOverviewPublic> {
  const client = getPublicApiClient(apiUrl);
  return client.get<WelcomeOverviewPublic>('/api/v1/public/digest/welcome', {
    query: { locale: getClientLocale() },
    authMode: 'public',
  });
}

export async function getWelcomePage(apiUrl: string, slug: string): Promise<WelcomePagePublic> {
  const client = getPublicApiClient(apiUrl);
  return client.get<WelcomePagePublic>(
    `/api/v1/public/digest/welcome/pages/${encodeURIComponent(slug)}`,
    {
      query: { locale: getClientLocale() },
      authMode: 'public',
    }
  );
}
