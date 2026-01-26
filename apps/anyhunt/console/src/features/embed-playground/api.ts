/**
 * Embed API 调用
 */
import { OEMBED_API } from '@/lib/api-paths';
import { ApiKeyClient } from '@/features/playground-shared/api-key-client';
import type { EmbedFormData, EmbedResult } from './types';

interface EmbedApiResponse {
  data: EmbedResult['data'];
  meta: {
    provider: string;
    cached: boolean;
  };
}

/**
 * 获取 oEmbed 数据
 */
export async function fetchEmbed(apiKey: string, request: EmbedFormData): Promise<EmbedResult> {
  const client = new ApiKeyClient({ apiKey });
  const response = await client.post<EmbedApiResponse>(OEMBED_API.BASE, {
    url: request.url,
    maxwidth: request.maxWidth,
    maxheight: request.maxHeight,
    theme: request.theme,
  });

  return {
    data: response.data,
    provider: response.meta.provider,
    cached: response.meta.cached,
  };
}
