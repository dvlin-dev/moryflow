/**
 * [INPUT]: EmbedClientConfig, EmbedOptions
 * [OUTPUT]: EmbedData | EmbedError
 * [POS]: Embed API 客户端，供 @anyhunt/embed 与 @anyhunt/embed-react 调用
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 packages/embed/CLAUDE.md
 */
import type {
  EmbedClientConfig,
  EmbedOptions,
  EmbedData,
  EmbedResponse,
  EmbedErrorResponse,
} from './types';
import { ApiError, NetworkError } from './errors';

const DEFAULT_BASE_URL = 'https://server.anyhunt.app';
const DEFAULT_TIMEOUT = 30000;

/** Embed 客户端接口 */
export interface EmbedClient {
  fetch(url: string, options?: EmbedOptions): Promise<EmbedData>;
}

/**
 * 创建 Embed 客户端
 */
export function createEmbedClient(config: EmbedClientConfig): EmbedClient {
  const { apiKey, baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT } = config;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  async function fetchEmbed(url: string, options?: EmbedOptions): Promise<EmbedData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${normalizedBaseUrl}/api/v1/oembed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          maxwidth: options?.maxWidth,
          maxheight: options?.maxHeight,
          theme: options?.theme,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = (await response.json()) as EmbedResponse | EmbedErrorResponse;

      if (!response.ok || !json.success) {
        const errorData = json as EmbedErrorResponse;
        throw new ApiError(
          response.status,
          errorData.error?.code || 'UNKNOWN_ERROR',
          errorData.error?.message || 'Request failed'
        );
      }

      return json.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) throw error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout');
        }
        throw new NetworkError(error.message);
      }

      throw new NetworkError('Unknown network error');
    }
  }

  return { fetch: fetchEmbed };
}
