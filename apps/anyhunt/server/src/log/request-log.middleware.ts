/**
 * [INPUT]: Express Request/Response 生命周期
 * [OUTPUT]: 标准化 RequestLogWriteInput（异步落库）
 * [POS]: 全局请求采集中间件（行为分析 + 错误排查 + IP 监控）
 */

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { ApiKeyValidationResult } from '../api-key/api-key.types';
import type { RequestLogWriteInput } from './request-log.service';
import {
  REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH,
  REQUEST_LOG_MAX_PATH_LENGTH,
  REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH,
} from './request-log.constants';
import { RequestLogService } from './request-log.service';

const ROUTE_GROUP_PREFIXES: Array<{ prefix: string; group: string }> = [
  { prefix: '/api/v1/admin/', group: 'admin' },
  { prefix: '/api/v1/agent', group: 'agent' },
  { prefix: '/api/v1/scrape', group: 'scrape' },
  { prefix: '/api/v1/crawl', group: 'crawl' },
  { prefix: '/api/v1/map', group: 'map' },
  { prefix: '/api/v1/search', group: 'search' },
  { prefix: '/api/v1/extract', group: 'extract' },
  { prefix: '/api/v1/memory', group: 'memory' },
  { prefix: '/api/v1/entity', group: 'entity' },
  { prefix: '/api/v1/browser', group: 'browser' },
  { prefix: '/api/v1/batch-scrape', group: 'batch-scrape' },
  { prefix: '/api/v1/webhook', group: 'webhook' },
  { prefix: '/api/v1/quota', group: 'quota' },
  { prefix: '/api/v1/oembed', group: 'oembed' },
  { prefix: '/api/v1/user', group: 'user' },
  { prefix: '/api/v1/app/user', group: 'app-user' },
  { prefix: '/api/auth/', group: 'auth' },
  { prefix: '/health', group: 'health' },
];

const REQUEST_LOG_SKIP_PREFIXES = ['/api/v1/admin/logs'];

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private readonly requestLogService: RequestLogService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    const path = this.resolvePath(req);
    if (this.shouldSkip(path)) {
      next();
      return;
    }

    const routeGroup = this.resolveRouteGroup(path);
    const forwardedFor = this.headerToString(req.headers['x-forwarded-for']);
    const requestBytes = this.parseBytes(req.headers['content-length']);

    let capturedErrorCode: string | undefined;
    let capturedErrorMessage: string | undefined;

    const captureErrorFromBody = (body: unknown) => {
      if (res.statusCode < 400) {
        return;
      }

      if (!body || typeof body !== 'object') {
        return;
      }

      const record = body as Record<string, unknown>;

      const directCode = this.pickString(record.code);
      const directDetail = this.pickString(record.detail);
      const directMessage = this.pickString(record.message);

      const nestedError =
        record.error && typeof record.error === 'object'
          ? (record.error as Record<string, unknown>)
          : undefined;

      const nestedCode = nestedError
        ? this.pickString(nestedError.code)
        : undefined;
      const nestedMessage = nestedError
        ? this.pickString(nestedError.message)
        : undefined;

      const messageCandidate =
        directDetail ?? directMessage ?? nestedMessage ?? capturedErrorMessage;
      const codeCandidate = directCode ?? nestedCode ?? capturedErrorCode;

      if (codeCandidate) {
        capturedErrorCode = codeCandidate;
      }

      if (messageCandidate) {
        capturedErrorMessage = messageCandidate
          .trim()
          .slice(0, REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH);
      }
    };

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      captureErrorFromBody(body);
      return originalJson(body);
    }) as Response['json'];

    const originalSend = res.send.bind(res);
    res.send = ((body?: unknown) => {
      if (res.statusCode >= 400 && typeof body === 'string') {
        capturedErrorMessage = body
          .trim()
          .slice(0, REQUEST_LOG_MAX_ERROR_MESSAGE_LENGTH);
      }
      return originalSend(body as never);
    }) as Response['send'];

    let handled = false;
    const finalize = () => {
      if (handled) {
        return;
      }
      handled = true;

      const durationMs = Number(
        (process.hrtime.bigint() - start) / BigInt(1_000_000),
      );
      const responseBytes = this.parseBytes(res.getHeader('content-length'));

      const apiKey = (req as Request & { apiKey?: ApiKeyValidationResult })
        .apiKey;
      const user = req.user;

      const statusCode = Math.max(0, res.statusCode || 0);
      const isError = statusCode >= 400;
      const errorCode = isError
        ? (capturedErrorCode ?? `HTTP_${statusCode}`)
        : undefined;
      const errorMessage = isError ? capturedErrorMessage : undefined;

      const logInput: RequestLogWriteInput = {
        requestId: this.resolveRequestId(req),
        method: req.method,
        path,
        routeGroup,
        statusCode,
        durationMs: Math.max(0, durationMs),
        authType: apiKey?.id ? 'apiKey' : user?.id ? 'session' : 'anonymous',
        userId: user?.id,
        apiKeyId: apiKey?.id,
        clientIp: this.resolveClientIp(req, forwardedFor),
        forwardedFor,
        origin: this.headerToString(req.headers.origin),
        referer: this.headerToString(req.headers.referer),
        userAgent: this.headerToString(req.headers['user-agent']),
        errorCode,
        errorMessage,
        retryAfter: this.headerToString(res.getHeader('retry-after')),
        rateLimitLimit: this.headerToString(res.getHeader('x-ratelimit-limit')),
        rateLimitRemaining: this.headerToString(
          res.getHeader('x-ratelimit-remaining'),
        ),
        rateLimitReset: this.headerToString(res.getHeader('x-ratelimit-reset')),
        requestBytes,
        responseBytes,
      };

      this.requestLogService.writeAsync(logInput);
    };

    res.once('finish', finalize);
    res.once('close', finalize);

    next();
  }

  private shouldSkip(path: string): boolean {
    const normalized = path.toLowerCase();
    return REQUEST_LOG_SKIP_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    );
  }

  private resolvePath(req: Request): string {
    const fromPath =
      typeof req.path === 'string' && req.path.length > 0 ? req.path : '';
    if (fromPath) {
      return fromPath.slice(0, REQUEST_LOG_MAX_PATH_LENGTH);
    }

    const fromOriginalUrl =
      typeof req.originalUrl === 'string' && req.originalUrl.length > 0
        ? req.originalUrl.split('?')[0]
        : '/';

    return fromOriginalUrl.slice(0, REQUEST_LOG_MAX_PATH_LENGTH);
  }

  private resolveRouteGroup(path: string): string {
    const normalized = path.toLowerCase();

    for (const item of ROUTE_GROUP_PREFIXES) {
      if (normalized.startsWith(item.prefix)) {
        return item.group;
      }
    }

    const segments = normalized.split('/').filter(Boolean);
    if (segments.length >= 3 && segments[0] === 'api' && segments[1] === 'v1') {
      return segments[2].slice(0, REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH);
    }

    if (segments.length > 0) {
      return segments[0].slice(0, REQUEST_LOG_MAX_ROUTE_GROUP_LENGTH);
    }

    return 'root';
  }

  private resolveRequestId(req: Request): string | undefined {
    const requestId = (req as Request & { requestId?: string }).requestId;
    if (requestId && requestId.trim().length > 0) {
      return requestId.trim();
    }

    return this.headerToString(req.headers['x-request-id']);
  }

  private resolveClientIp(req: Request, forwardedFor?: string): string {
    const fromReqIp = this.normalizeIp(req.ip);
    if (fromReqIp) {
      return fromReqIp;
    }

    if (forwardedFor) {
      const firstForwarded = forwardedFor.split(',')[0]?.trim();
      const normalizedForwarded = this.normalizeIp(firstForwarded);
      if (normalizedForwarded) {
        return normalizedForwarded;
      }
    }

    return 'unknown';
  }

  private normalizeIp(ip?: string): string | undefined {
    if (!ip) {
      return undefined;
    }

    const trimmed = ip.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    if (trimmed.startsWith('::ffff:')) {
      return trimmed.slice(7);
    }

    return trimmed;
  }

  private parseBytes(value: unknown): number | undefined {
    const normalized = this.headerToString(value);
    if (!normalized) {
      return undefined;
    }

    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return parsed;
  }

  private headerToString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    }

    if (Array.isArray(value) && value.length > 0) {
      const normalized = value
        .map((item) => String(item))
        .join(',')
        .trim();
      return normalized.length > 0 ? normalized : undefined;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return undefined;
  }

  private pickString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }
}
