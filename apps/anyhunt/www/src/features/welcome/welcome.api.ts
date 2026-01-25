/**
 * Welcome API (public)
 *
 * [PROVIDES]: getWelcomeOverview, getWelcomePage
 * [POS]: /welcome 的数据源（服务端可配置，i18n-ready）
 */

import { ApiError } from '@/lib/api';
import type { WelcomeOverviewPublic, WelcomePagePublic } from './welcome.types';

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  details?: unknown;
  errors?: Array<{ field?: string; message: string }>;
}

async function throwApiError(response: Response): Promise<never> {
  const contentType = response.headers.get('content-type') ?? '';
  const isJson =
    contentType.includes('application/json') || contentType.includes('application/problem+json');
  const payload = isJson ? await response.json().catch(() => ({})) : {};
  const problem = payload as ProblemDetails;
  const message =
    typeof problem?.detail === 'string' ? problem.detail : `Request failed (${response.status})`;
  const code = typeof problem?.code === 'string' ? problem.code : undefined;
  throw new ApiError(
    message,
    response.status,
    code,
    problem?.details,
    problem?.requestId,
    problem?.errors
  );
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    await throwApiError(response);
  }
  return (await response.json()) as T;
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

  return parseJsonResponse<WelcomeOverviewPublic>(response);
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

  return parseJsonResponse<WelcomePagePublic>(response);
}
