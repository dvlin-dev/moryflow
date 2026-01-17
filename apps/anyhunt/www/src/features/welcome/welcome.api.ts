/**
 * [PROVIDES]: Welcome config API client (public)
 * [POS]: /welcome 页面内容来源（可后台动态配置）
 */

import { ApiError } from '@/lib/api';

export type WelcomeAction = { label: string; action: 'openExplore' | 'openSignIn' };

export interface WelcomeConfigPublic {
  enabled: boolean;
  title: string;
  contentMarkdown: string;
  primaryAction: WelcomeAction | null;
  secondaryAction: WelcomeAction | null;
}

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

export async function getWelcomeConfig(apiUrl: string): Promise<WelcomeConfigPublic> {
  const locale =
    typeof window === 'undefined' ? 'en' : navigator.language || navigator.languages?.[0] || 'en';

  const params = new URLSearchParams();
  params.set('locale', locale);

  const response = await fetch(`${apiUrl}/api/v1/digest/welcome?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const json = (await response.json()) as ApiResponse<WelcomeConfigPublic>;
  return handleApiResponse(response, json);
}
