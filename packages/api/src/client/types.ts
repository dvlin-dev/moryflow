/**
 * [DEFINES]: AuthMode/ApiTransport/ApiClient 统一函数式请求类型
 * [USED_BY]: transport.ts, create-api-client.ts, 各端请求封装
 * [POS]: packages/api 客户端类型层（无业务语义）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ProblemDetails } from '@moryflow/types';
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

// ── 业务类型别名（供应用层复用）──────────────────────────

export type UserInfo = MembershipUserInfo;
export type UserProfile = MembershipUserProfile;
export type ModelsResponse = MembershipModelsResponse;

// ── 通用请求类型 ─────────────────────────────────────────

export type AuthMode = 'public' | 'bearer' | 'apiKey';

export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitive | QueryPrimitive[];
export type QueryParams = Record<string, QueryValue>;

export type ApiBody =
  | string
  | FormData
  | Blob
  | URLSearchParams
  | ArrayBuffer
  | ArrayBufferView
  | null
  | undefined
  | object;

export type ResponseType = 'json' | 'raw' | 'blob' | 'stream';

export type ApiTokenGetter = () => string | null | Promise<string | null>;
export type UnauthorizedHandler = () => boolean | Promise<boolean>;

export interface TransportRequest {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  query?: QueryParams;
  body?: ApiBody;
  signal?: AbortSignal;
  timeoutMs?: number;
  redirect?: RequestRedirect;
  responseType?: ResponseType;
}

export interface ApiTransportConfig {
  baseUrl: string;
  fetcher?: typeof fetch;
  defaultHeaders?: HeadersInit;
  timeoutMs?: number;
}

export interface ApiTransport {
  request<T>(request: TransportRequest): Promise<T>;
}

export interface ApiClientRequestOptions {
  method?: TransportRequest['method'];
  headers?: HeadersInit;
  query?: QueryParams;
  body?: ApiBody;
  signal?: AbortSignal;
  timeoutMs?: number;
  redirect?: RequestRedirect;
  authMode?: AuthMode;
}

export interface ApiClientConfig {
  baseUrl?: string;
  transport?: ApiTransport;
  defaultAuthMode?: AuthMode;
  getAccessToken?: ApiTokenGetter;
  getApiKey?: ApiTokenGetter;
  onUnauthorized?: UnauthorizedHandler;
}

export interface ApiClient {
  get<T>(path: string, options?: Omit<ApiClientRequestOptions, 'body'>): Promise<T>;
  post<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
  put<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
  patch<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
  del<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
  raw(path: string, options?: ApiClientRequestOptions): Promise<Response>;
  blob(path: string, options?: ApiClientRequestOptions): Promise<Blob>;
  stream(path: string, options?: ApiClientRequestOptions): Promise<Response>;
}

export type ApiProblem = ProblemDetails;

// ── 业务类型重导出（保留单一导出入口）────────────────────

export type {
  CreditsInfo,
  ProductsResponse,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  DeleteAccountRequest,
};
