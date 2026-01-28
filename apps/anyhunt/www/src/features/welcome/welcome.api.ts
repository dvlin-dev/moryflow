/**
 * Welcome API (public)
 *
 * [PROVIDES]: getWelcomeOverview, getWelcomePage
 * [POS]: /welcome 的数据源（服务端可配置，i18n-ready）
 */

import { parseJsonResponse } from '@/lib/api';
import type { WelcomeOverviewPublic, WelcomePagePublic } from './welcome.types';

function getClientLocale(): string {
  if (typeof window === 'undefined') return 'en';
  return navigator.language || navigator.languages?.[0] || 'en';
}

export async function getWelcomeOverview(apiUrl: string): Promise<WelcomeOverviewPublic> {
  const params = new URLSearchParams();
  params.set('locale', getClientLocale());

  const response = await fetch(`${apiUrl}/api/v1/public/digest/welcome?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return parseJsonResponse<WelcomeOverviewPublic>(response);
}

export async function getWelcomePage(apiUrl: string, slug: string): Promise<WelcomePagePublic> {
  const params = new URLSearchParams();
  params.set('locale', getClientLocale());

  const response = await fetch(
    `${apiUrl}/api/v1/public/digest/welcome/pages/${encodeURIComponent(slug)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return parseJsonResponse<WelcomePagePublic>(response);
}
