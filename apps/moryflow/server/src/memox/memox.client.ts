import { Injectable } from '@nestjs/common';
import {
  serverHttpJson,
  serverHttpVoid,
  ServerApiError,
} from '../common/http/server-http-client';
import {
  MemoxCreateSourceRevisionBodySchema,
  MemoxFinalizeSourceRevisionResponseSchema,
  MemoxSourceIdentityResponseSchema,
  type MemoxSourceIdentityLookupQuery,
  MemoxSourceRevisionResponseSchema,
  MemoxSourceSearchResponseSchema,
  type MemoxCreateSourceRevisionBody,
  type MemoxFinalizeSourceRevisionResponse,
  type MemoxSourceIdentityBody,
  type MemoxSourceIdentityResponse,
  type MemoxSourceRevisionResponse,
  type MemoxSourceSearchRequest,
  type MemoxSourceSearchResponse,
} from './dto/memox.dto';
import { MemoxRuntimeConfigService } from './memox-runtime-config.service';

const INTERNAL_TENANT_API_KEY_HEADER = 'X-Anyhunt-Api-Key';

type MemoxAuthMode = 'public' | 'internal-tenant';

export class MemoxGatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'MemoxGatewayError';
  }
}

@Injectable()
export class MemoxClient {
  constructor(
    private readonly runtimeConfigService: MemoxRuntimeConfigService,
  ) {}

  async getSourceIdentity(params: {
    sourceType: string;
    externalId: string;
    query: MemoxSourceIdentityLookupQuery;
    requestId?: string;
  }): Promise<MemoxSourceIdentityResponse> {
    const authMode = this.resolveWriteAuthMode();
    return this.requestJson<MemoxSourceIdentityResponse>({
      path:
        authMode === 'internal-tenant'
          ? this.buildInternalSourceIdentityPath(
              params.sourceType,
              params.externalId,
              params.query,
            )
          : this.buildSourceIdentityPath(
              params.sourceType,
              params.externalId,
              params.query,
            ),
      method: 'GET',
      requestId: params.requestId,
      schema: MemoxSourceIdentityResponseSchema,
      authMode,
    });
  }

  async resolveSourceIdentity(params: {
    sourceType: string;
    externalId: string;
    body: MemoxSourceIdentityBody;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<MemoxSourceIdentityResponse> {
    const authMode = this.resolveWriteAuthMode();
    const response = await this.requestJson<MemoxSourceIdentityResponse>({
      path:
        authMode === 'internal-tenant'
          ? this.buildInternalSourceIdentityPath(
              params.sourceType,
              params.externalId,
            )
          : this.buildSourceIdentityPath(params.sourceType, params.externalId),
      method: 'PUT',
      body: params.body,
      idempotencyKey: params.idempotencyKey,
      requestId: params.requestId,
      schema: MemoxSourceIdentityResponseSchema,
      authMode,
    });

    return response;
  }

  async searchSources(params: {
    body: MemoxSourceSearchRequest;
    requestId?: string;
  }): Promise<MemoxSourceSearchResponse> {
    return this.requestJson<MemoxSourceSearchResponse>({
      path: '/api/v1/sources/search',
      method: 'POST',
      body: params.body,
      requestId: params.requestId,
      schema: MemoxSourceSearchResponseSchema,
    });
  }

  async createSourceRevision(params: {
    sourceId: string;
    body: MemoxCreateSourceRevisionBody;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<MemoxSourceRevisionResponse> {
    const authMode = this.resolveWriteAuthMode();
    return this.requestJson<MemoxSourceRevisionResponse>({
      path:
        authMode === 'internal-tenant'
          ? `/api/internal/memox/sources/${encodeURIComponent(params.sourceId)}/revisions`
          : `/api/v1/sources/${encodeURIComponent(params.sourceId)}/revisions`,
      method: 'POST',
      body: MemoxCreateSourceRevisionBodySchema.parse(params.body),
      idempotencyKey: params.idempotencyKey,
      requestId: params.requestId,
      schema: MemoxSourceRevisionResponseSchema,
      authMode,
    });
  }

  async finalizeSourceRevision(params: {
    revisionId: string;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<MemoxFinalizeSourceRevisionResponse> {
    const authMode = this.resolveWriteAuthMode();
    return this.requestJson<MemoxFinalizeSourceRevisionResponse>({
      path:
        authMode === 'internal-tenant'
          ? `/api/internal/memox/source-revisions/${encodeURIComponent(params.revisionId)}/finalize`
          : `/api/v1/source-revisions/${encodeURIComponent(params.revisionId)}/finalize`,
      method: 'POST',
      idempotencyKey: params.idempotencyKey,
      requestId: params.requestId,
      schema: MemoxFinalizeSourceRevisionResponseSchema,
      authMode,
    });
  }

  async deleteSource(params: {
    sourceId: string;
    idempotencyKey: string;
    requestId?: string;
  }): Promise<void> {
    const authMode = this.resolveWriteAuthMode();
    await this.requestJson<unknown>({
      path:
        authMode === 'internal-tenant'
          ? `/api/internal/memox/sources/${encodeURIComponent(params.sourceId)}`
          : `/api/v1/sources/${encodeURIComponent(params.sourceId)}`,
      method: 'DELETE',
      idempotencyKey: params.idempotencyKey,
      requestId: params.requestId,
      schema: { parse: (input: unknown) => input },
      authMode,
    });
  }

  async requestVoid(params: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    requestId?: string;
    idempotencyKey?: string;
    authMode?: MemoxAuthMode;
  }): Promise<void> {
    try {
      await serverHttpVoid({
        url: this.buildRequestUrl(params.path),
        method: params.method,
        headers: this.buildHeaders(params, params.authMode ?? 'public'),
        body:
          params.body === undefined ? undefined : JSON.stringify(params.body),
        timeoutMs: this.runtimeConfigService.getAnyhuntRequestTimeoutMs(),
      });
    } catch (error) {
      if (error instanceof ServerApiError) {
        throw new MemoxGatewayError(
          error.message,
          error.status,
          error.code,
          error.details,
          error.requestId,
        );
      }
      throw error;
    }
  }

  async requestJson<T>(params: {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    requestId?: string;
    idempotencyKey?: string;
    schema: { parse: (input: unknown) => T };
    authMode?: MemoxAuthMode;
  }): Promise<T> {
    try {
      const response = await serverHttpJson<unknown>({
        url: this.buildRequestUrl(params.path),
        method: params.method,
        headers: this.buildHeaders(params, params.authMode ?? 'public'),
        body:
          params.body === undefined ? undefined : JSON.stringify(params.body),
        timeoutMs: this.runtimeConfigService.getAnyhuntRequestTimeoutMs(),
      });

      return params.schema.parse(response);
    } catch (error) {
      if (error instanceof ServerApiError) {
        throw new MemoxGatewayError(
          error.message,
          error.status,
          error.code,
          error.details,
          error.requestId,
        );
      }
      throw error;
    }
  }

  private buildSourceIdentityPath(
    sourceType: string,
    externalId: string,
    query?: MemoxSourceIdentityLookupQuery,
  ): string {
    const basePath = `/api/v1/source-identities/${encodeURIComponent(sourceType)}/${encodeURIComponent(externalId)}`;
    if (!query) {
      return basePath;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value.length > 0) {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
  }

  private buildInternalSourceIdentityPath(
    sourceType: string,
    externalId: string,
    query?: MemoxSourceIdentityLookupQuery,
  ): string {
    const basePath = `/api/internal/memox/source-identities/${encodeURIComponent(sourceType)}/${encodeURIComponent(externalId)}`;
    if (!query) {
      return basePath;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' && value.length > 0) {
        searchParams.set(key, value);
      }
    }

    const queryString = searchParams.toString();
    return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
  }

  private buildRequestUrl(path: string): string {
    return `${this.runtimeConfigService.getAnyhuntApiBaseUrl()}${path}`;
  }

  private resolveWriteAuthMode(): MemoxAuthMode {
    return this.runtimeConfigService.getAnyhuntInternalApiToken()
      ? 'internal-tenant'
      : 'public';
  }

  private buildHeaders(
    params: {
      idempotencyKey?: string;
      requestId?: string;
    },
    authMode: MemoxAuthMode,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authMode === 'internal-tenant') {
      headers.Authorization = `Bearer ${this.runtimeConfigService.getAnyhuntInternalApiToken()}`;
      headers[INTERNAL_TENANT_API_KEY_HEADER] =
        this.runtimeConfigService.getAnyhuntApiKey();
    } else {
      headers.Authorization = `Bearer ${this.runtimeConfigService.getAnyhuntApiKey()}`;
    }
    if (params.idempotencyKey) {
      headers['Idempotency-Key'] = params.idempotencyKey;
    }
    if (params.requestId) {
      headers['X-Request-Id'] = params.requestId;
    }

    return headers;
  }
}
