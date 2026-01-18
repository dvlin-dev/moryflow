/**
 * Welcome API (public)
 *
 * [PROVIDES]: getWelcomeOverview, getWelcomePage
 * [POS]: /welcome 的数据源（服务端可配置，i18n-ready）
 */

import { ApiError } from '@/lib/api';
import type { WelcomeOverviewPublic, WelcomePagePublic } from './welcome.types';

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

function handleApiResponse<T>(response: Response, json: ApiResponse<T>): T {
  if (!response.ok || !json.success) {
    const errorJson = json as ApiErrorResponse;
    throw new ApiError(
      errorJson.error?.message || `Request failed (${response.status})`,
      errorJson.error?.code
    );
  }
  return json.data;
}

function getClientLocale(): string {
  if (typeof window === 'undefined') return 'en';
  return navigator.language || navigator.languages?.[0] || 'en';
}

export async function getWelcomeOverview(apiUrl: string): Promise<WelcomeOverviewPublic> {
  const params = new URLSearchParams();
  params.set('locale', getClientLocale());

  const response = await fetch(`${apiUrl}/api/v1/digest/welcome?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = (await response.json()) as ApiResponse<WelcomeOverviewPublic>;
  return handleApiResponse(response, json);
}

export async function getWelcomePage(apiUrl: string, slug: string): Promise<WelcomePagePublic> {
  const params = new URLSearchParams();
  params.set('locale', getClientLocale());

  const response = await fetch(
    `${apiUrl}/api/v1/digest/welcome/pages/${encodeURIComponent(slug)}?${params.toString()}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  const json = (await response.json()) as ApiResponse<WelcomePagePublic>;
  return handleApiResponse(response, json);
}
