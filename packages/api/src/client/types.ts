/**
 * [DEFINES]: TokenProvider, ServerApiPlugin, ServerApiClientConfig, ServerApiClient
 * [USED_BY]: create-client.ts, 各端适配器
 * [POS]: 统一 API 客户端的类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type {
  MembershipUserInfo,
  CreditsInfo,
  MembershipUserProfile,
  MembershipModelsResponse,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
} from '../membership/types';
import type { DeleteAccountRequest } from '../account';

// ── 类型别名（统一为 Server 命名）─────────────────────────

export type UserInfo = MembershipUserInfo;
export type UserProfile = MembershipUserProfile;
export type ModelsResponse = MembershipModelsResponse;

// ── Token 提供者接口 ─────────────────────────────────────

/** Token 提供者接口 - 各端实现 */
export interface TokenProvider {
  /** 获取 token（支持同步和异步） */
  getToken(): Promise<string | null> | string | null;
}

// ── 插件接口 ─────────────────────────────────────────────

/** 插件接口 - 可选扩展 */
export interface ServerApiPlugin {
  name: string;
  /** 请求前置处理 */
  onRequest?: (url: string, options: RequestInit) => RequestInit;
  /** 响应后置处理 */
  onResponse?: (response: Response) => void;
}

// ── 客户端配置 ───────────────────────────────────────────

/** 客户端配置 */
export interface ServerApiClientConfig {
  /** API 基础 URL */
  baseUrl: string;
  /** Token 提供者（必须） */
  tokenProvider: TokenProvider;
  /** 401 时的回调（返回 true 表示已刷新并允许重试） */
  onUnauthorized?: () => boolean | Promise<boolean>;
  /** 插件列表（可选） */
  plugins?: ServerApiPlugin[];
}

// ── API 客户端实例 ───────────────────────────────────────

/** API 客户端实例 */
export interface ServerApiClient {
  /** 用户相关 */
  user: {
    fetchCurrent(): Promise<UserInfo>;
    fetchCredits(): Promise<CreditsInfo>;
    fetchProfile(): Promise<UserProfile>;
    updateProfile(data: Partial<UserProfile>): Promise<UserProfile>;
    deleteAccount(data: DeleteAccountRequest): Promise<void>;
  };

  /** 模型相关 */
  models: {
    fetch(): Promise<ModelsResponse>;
  };

  /** 支付相关 */
  payment: {
    fetchProducts(): Promise<ProductsResponse>;
    createCheckout(data: CreateCheckoutRequest): Promise<CreateCheckoutResponse>;
  };
}

// ── 重导出类型（便于外部使用） ───────────────────────────

export type {
  CreditsInfo,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  DeleteAccountRequest,
};
