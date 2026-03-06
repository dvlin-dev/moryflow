/**
 * [PROVIDES]: 函数式 API client 导出入口
 * [DEPENDS]: error.ts, types.ts, transport.ts, create-api-client.ts
 * [POS]: packages/api 请求层统一导出
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export { ServerApiError } from './error';
export { createApiTransport } from './transport';
export { createApiClient } from './create-api-client';
export { fetchRaw } from './fetch-raw';
export type { FetchRawOptions } from './fetch-raw';

export type {
  AuthMode,
  ApiBody,
  ApiProblem,
  QueryParams,
  ResponseType,
  ApiTokenGetter,
  UnauthorizedHandler,
  ApiTransportConfig,
  ApiTransport,
  TransportRequest,
  ApiClientConfig,
  ApiClientRequestOptions,
  ApiClient,
  UserInfo,
  UserProfile,
  ModelsResponse,
  CreditsInfo,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  DeleteAccountRequest,
} from './types';
