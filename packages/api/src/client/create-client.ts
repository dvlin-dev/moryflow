/**
 * [PROVIDES]: createServerApiClient - 统一 API 客户端工厂函数
 * [DEPENDS]: paths.ts, membership/const.ts, error.ts, types.ts
 * [POS]: 核心工厂函数，被 Mobile 和 PC 端适配器调用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { USER_API, OPENAI_API, PAYMENT_API } from '../paths';
import { getTierInfo } from '../membership/const';
import { ServerApiError } from './error';
import type {
  ServerApiClientConfig,
  ServerApiClient,
  UserInfo,
  UserProfile,
  CreditsInfo,
  ModelsResponse,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  DeleteAccountRequest,
} from './types';

/** 创建 Server API 客户端 */
export function createServerApiClient(config: ServerApiClientConfig): ServerApiClient {
  const { baseUrl, tokenProvider, onUnauthorized, plugins = [] } = config;

  // 内部请求函数
  async function request<T>(
    path: string,
    options: RequestInit & { public?: boolean } = {},
    attempt = 0
  ): Promise<T> {
    // 获取 token（支持同步和异步）
    const token = options.public ? null : await tokenProvider.getToken();

    let finalOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };

    const url = `${baseUrl}${path}`;

    // 执行插件的 onRequest
    for (const plugin of plugins) {
      if (plugin.onRequest) {
        finalOptions = plugin.onRequest(url, finalOptions);
      }
    }

    const response = await fetch(url, finalOptions);

    // 执行插件的 onResponse
    for (const plugin of plugins) {
      plugin.onResponse?.(response);
    }

    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) {
        const shouldRetry = await onUnauthorized();
        if (shouldRetry && attempt === 0) {
          return request<T>(path, options, attempt + 1);
        }
      }
      const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ServerApiError(
        response.status,
        (errorData.message as string) || `Request failed: ${response.status}`,
        errorData.code as string | undefined,
        errorData
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // 返回 API 方法
  return {
    user: {
      async fetchCurrent(): Promise<UserInfo> {
        const user = await request<Omit<UserInfo, 'tierInfo'>>(USER_API.ME);
        // 前端补充 tierInfo
        return { ...user, tierInfo: getTierInfo(user.subscriptionTier) };
      },

      fetchCredits(): Promise<CreditsInfo> {
        return request<CreditsInfo>(USER_API.CREDITS);
      },

      fetchProfile(): Promise<UserProfile> {
        return request<UserProfile>(USER_API.PROFILE);
      },

      updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
        return request<UserProfile>(USER_API.PROFILE, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      deleteAccount(data: DeleteAccountRequest): Promise<void> {
        return request<void>(USER_API.DELETE_ACCOUNT, {
          method: 'DELETE',
          body: JSON.stringify(data),
        });
      },
    },

    models: {
      fetch(): Promise<ModelsResponse> {
        return request<ModelsResponse>(OPENAI_API.MODELS);
      },
    },

    payment: {
      // 公开接口，无需 token
      fetchProducts(): Promise<ProductsResponse> {
        return request<ProductsResponse>(PAYMENT_API.PRODUCTS, { public: true });
      },

      createCheckout(data: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
        return request<CreateCheckoutResponse>(PAYMENT_API.CHECKOUT, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
    },
  };
}
