import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { RequestLogMiddleware } from '../request-log.middleware';
import type { RequestLogService } from '../request-log.service';

function createMockResponse(statusCode = 200): Response {
  const emitter = new EventEmitter();
  const headers = new Map<string, unknown>();

  const res = {
    statusCode,
    json: vi.fn(function json(this: Response, body?: unknown) {
      return this.send(
        typeof body === 'string' ? body : JSON.stringify(body),
      ) as unknown as Response;
    }),
    send: vi.fn(function send(this: Response) {
      return this;
    }),
    getHeader: vi.fn((name: string) => headers.get(name.toLowerCase())),
    setHeader: vi.fn((name: string, value: unknown) => {
      headers.set(name.toLowerCase(), value);
      return res;
    }),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
  } as unknown as Response;

  return res;
}

describe('RequestLogMiddleware', () => {
  it('should capture request and persist log on response finish', () => {
    const writeAsync = vi.fn();
    const middleware = new RequestLogMiddleware({
      writeAsync,
    } as unknown as RequestLogService);

    const req = {
      method: 'POST',
      path: '/api/v1/agent',
      originalUrl: '/api/v1/agent',
      headers: {
        authorization: 'Bearer ah_xxx',
        'x-request-id': 'req_1',
        origin: 'https://console.anyhunt.app',
        'user-agent': 'vitest',
        'content-length': '128',
      },
      user: {
        id: 'user_1',
        email: 'u@example.com',
        name: null,
        subscriptionTier: 'FREE',
        isAdmin: false,
      },
      apiKey: {
        id: 'key_1',
      },
      ip: '::ffff:127.0.0.1',
      requestId: 'req_1',
    } as unknown as Request;

    const res = createMockResponse(429);
    const next = vi.fn() as unknown as NextFunction;

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);

    res.json({ code: 'TOO_MANY_REQUESTS', detail: 'Too Many Requests' });
    (res as unknown as { emit: (event: string) => void }).emit('finish');

    expect(writeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req_1',
        method: 'POST',
        path: '/api/v1/agent',
        routeGroup: 'agent',
        statusCode: 429,
        authType: 'apiKey',
        userId: 'user_1',
        apiKeyId: 'key_1',
        clientIp: '127.0.0.1',
        requestBytes: 128,
        errorCode: 'TOO_MANY_REQUESTS',
        errorMessage: 'Too Many Requests',
      }),
    );
  });

  it('should not mark successful response payload as error', () => {
    const writeAsync = vi.fn();
    const middleware = new RequestLogMiddleware({
      writeAsync,
    } as unknown as RequestLogService);

    const req = {
      method: 'GET',
      path: '/api/v1/search',
      originalUrl: '/api/v1/search',
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = createMockResponse(200);
    const next = vi.fn() as unknown as NextFunction;

    middleware.use(req, res, next);
    res.json({ code: 'OK', message: 'not-an-error' });
    (res as unknown as { emit: (event: string) => void }).emit('finish');

    expect(writeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 200,
        errorCode: undefined,
        errorMessage: undefined,
      }),
    );
  });

  it('should skip logging for admin log endpoints', () => {
    const writeAsync = vi.fn();
    const middleware = new RequestLogMiddleware({
      writeAsync,
    } as unknown as RequestLogService);

    const req = {
      method: 'GET',
      path: '/api/v1/admin/logs/requests',
      originalUrl: '/api/v1/admin/logs/requests',
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = createMockResponse(200);
    const next = vi.fn() as unknown as NextFunction;

    middleware.use(req, res, next);
    (res as unknown as { emit: (event: string) => void }).emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(writeAsync).not.toHaveBeenCalled();
  });

  it('should skip preflight options request logging', () => {
    const writeAsync = vi.fn();
    const middleware = new RequestLogMiddleware({
      writeAsync,
    } as unknown as RequestLogService);

    const req = {
      method: 'OPTIONS',
      path: '/api/v1/agent',
      originalUrl: '/api/v1/agent',
      headers: {},
      ip: '127.0.0.1',
    } as unknown as Request;

    const res = createMockResponse(204);
    const next = vi.fn() as unknown as NextFunction;

    middleware.use(req, res, next);
    (res as unknown as { emit: (event: string) => void }).emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(writeAsync).not.toHaveBeenCalled();
  });
});
