/**
 * [PROVIDES]: 统一 Server API 客户端模块
 * [DEPENDS]: error.ts, types.ts, create-client.ts
 * [POS]: 客户端模块入口，被 Mobile 和 PC 端使用
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// 错误类
export { ServerApiError } from './error'

// 类型
export type {
  TokenProvider,
  ServerApiPlugin,
  ServerApiClientConfig,
  ServerApiClient,
  UserInfo,
  UserProfile,
  ModelsResponse,
  CreditsInfo,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  DeleteAccountRequest,
} from './types'

// 工厂函数
export { createServerApiClient } from './create-client'
