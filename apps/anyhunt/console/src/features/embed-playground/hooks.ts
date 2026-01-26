/**
 * Embed Playground Hooks
 */
import { useMutation } from '@tanstack/react-query';
import { fetchEmbed } from './api';
import type { EmbedFormData, EmbedResult } from './types';

interface FetchEmbedParams {
  apiKey: string;
  request: EmbedFormData;
}

/**
 * 获取 oEmbed 数据的 mutation hook
 */
export function useFetchEmbed() {
  return useMutation<EmbedResult, Error, FetchEmbedParams>({
    mutationFn: ({ apiKey, request }) => fetchEmbed(apiKey, request),
  });
}
