/**
 * [INPUT]: API endpoint, request options
 * [OUTPUT]: API response
 * [POS]: API 请求工具，封装认证和错误处理（函数式客户端）
 */

import {
  createApiClient,
  createApiTransport,
  ServerApiError,
  type ApiClientRequestOptions,
} from '@moryflow/api/client';
import { membershipBridge } from '../membership-bridge.js';

const API_BASE_URL = process.env.API_BASE_URL || 'https://server.moryflow.com';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

function createPublishApiClient() {
  const config = membershipBridge.getConfig();
  if (!config.token) {
    throw new Error('Please log in first');
  }

  return createApiClient({
    transport: createApiTransport({
      baseUrl: API_BASE_URL,
    }),
    defaultAuthMode: 'bearer',
    getAccessToken: () => config.token,
  });
}

/**
 * 发送 API 请求
 */
export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const client = createPublishApiClient();
  const method = (options.method?.toUpperCase() ?? 'GET') as RequestMethod;
  const body = options.body as ApiClientRequestOptions['body'];

  try {
    switch (method) {
      case 'POST':
        return await client.post<T>(endpoint, { headers: options.headers, body });
      case 'PUT':
        return await client.put<T>(endpoint, { headers: options.headers, body });
      case 'PATCH':
        return await client.patch<T>(endpoint, { headers: options.headers, body });
      case 'DELETE':
        return await client.del<T>(endpoint, { headers: options.headers, body });
      default:
        return await client.get<T>(endpoint, { headers: options.headers });
    }
  } catch (error) {
    if (error instanceof ServerApiError) {
      throw new Error(error.message || `API request failed: ${error.status}`);
    }

    throw error instanceof Error ? error : new Error('API request failed');
  }
}
