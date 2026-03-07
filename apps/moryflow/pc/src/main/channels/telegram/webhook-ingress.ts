/**
 * [INPUT]: webhook URL + secret + update handler
 * [OUTPUT]: 本地 webhook ingress（start/stop）
 * [POS]: Telegram webhook 入站接收边界（主进程）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import http, { type IncomingMessage, type ServerResponse } from 'node:http';

const DEFAULT_MAX_BODY_BYTES = 1_000_000;
const DEFAULT_BODY_TIMEOUT_MS = 30_000;

class WebhookPayloadTooLargeError extends Error {
  constructor() {
    super('webhook payload too large');
    this.name = 'WebhookPayloadTooLargeError';
  }
}

class WebhookBodyTimeoutError extends Error {
  constructor() {
    super('webhook body timeout');
    this.name = 'WebhookBodyTimeoutError';
  }
}

class WebhookBodyReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookBodyReadError';
  }
}

const readSecretHeader = (request: IncomingMessage): string => {
  const header = request.headers['x-telegram-bot-api-secret-token'];
  if (Array.isArray(header)) {
    return header[0] ?? '';
  }
  return typeof header === 'string' ? header : '';
};

const normalizePath = (rawPath: string): string => {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return '/';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const readBody = async (
  request: IncomingMessage,
  options: { maxBodyBytes: number; bodyTimeoutMs: number }
): Promise<string> => {
  return await new Promise((resolve, reject) => {
    let size = 0;
    let body = '';
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => {
        reject(new WebhookBodyTimeoutError());
      });
    }, options.bodyTimeoutMs);

    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      size += Buffer.byteLength(chunk, 'utf8');
      if (size > options.maxBodyBytes) {
        finish(() => {
          reject(new WebhookPayloadTooLargeError());
        });
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      finish(() => resolve(body));
    });
    request.on('aborted', () => {
      finish(() => reject(new WebhookBodyReadError('webhook request aborted')));
    });
    request.on('error', (error) => {
      finish(() =>
        reject(new WebhookBodyReadError(error instanceof Error ? error.message : String(error)))
      );
    });
  });
};

const json = (response: ServerResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const respondAndTerminateRequest = (
  request: IncomingMessage,
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
) => {
  const socket = request.socket;
  if (socket && !socket.destroyed && !response.headersSent) {
    const bodyText = JSON.stringify(payload);
    const statusText = http.STATUS_CODES[statusCode] ?? 'Error';
    const rawResponse = [
      `HTTP/1.1 ${statusCode} ${statusText}`,
      'Content-Type: application/json; charset=utf-8',
      'Connection: close',
      `Content-Length: ${Buffer.byteLength(bodyText, 'utf8')}`,
      '',
      bodyText,
    ].join('\r\n');

    const forceCloseTimer = setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }, 40);
    const clearForceCloseTimer = () => clearTimeout(forceCloseTimer);
    socket.once('close', clearForceCloseTimer);
    socket.once('finish', () => {
      clearForceCloseTimer();
      if (!request.destroyed) {
        request.destroy();
      }
    });
    socket.end(rawResponse);
    return;
  }

  if (response.writableEnded || response.destroyed) {
    if (!request.destroyed) {
      request.destroy();
    }
    return;
  }

  let terminated = false;
  const terminate = () => {
    if (terminated) {
      return;
    }
    terminated = true;
    clearTimeout(forcedTerminateTimer);
    if (request.socket && !request.socket.destroyed) {
      request.socket.destroy();
    }
    if (!request.destroyed) {
      request.destroy();
    }
  };

  const forcedTerminateTimer = setTimeout(() => {
    terminate();
  }, 40);

  response.once('finish', terminate);
  response.once('close', terminate);
  response.setHeader('Connection', 'close');
  json(response, statusCode, payload);
};

export type TelegramWebhookIngressHandle = {
  stop: () => Promise<void>;
};

export type TelegramWebhookIngressRoute = {
  accountId: string;
  webhookPath: string;
  webhookSecret: string;
  onUpdate: (update: unknown) => Promise<void>;
};

export const startTelegramWebhookIngress = async (input: {
  routes: TelegramWebhookIngressRoute[];
  listenHost?: string;
  listenPort?: number;
  maxBodyBytes?: number;
  bodyTimeoutMs?: number;
}): Promise<TelegramWebhookIngressHandle> => {
  if (input.routes.length === 0) {
    throw new Error('Webhook routes are required.');
  }

  const routeByPath = new Map<
    string,
    { accountId: string; webhookSecret: string; onUpdate: (update: unknown) => Promise<void> }
  >();
  for (const route of input.routes) {
    const expectedPath = normalizePath(route.webhookPath);
    if (routeByPath.has(expectedPath)) {
      throw new Error(`Webhook path conflict detected: ${expectedPath}`);
    }
    routeByPath.set(expectedPath, {
      accountId: route.accountId,
      webhookSecret: route.webhookSecret,
      onUpdate: route.onUpdate,
    });
  }

  const listenHost = input.listenHost?.trim() || '127.0.0.1';
  const listenPort = Number.isInteger(input.listenPort) ? Number(input.listenPort) : 8787;
  if (listenPort <= 0 || listenPort > 65_535) {
    throw new Error('Webhook listen port is invalid.');
  }
  const maxBodyBytes = input.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const bodyTimeoutMs = input.bodyTimeoutMs ?? DEFAULT_BODY_TIMEOUT_MS;

  const server = http.createServer(async (request, response) => {
    const requestUrl = request.url ? new URL(request.url, 'http://localhost') : null;
    const requestPath = requestUrl?.pathname ?? '/';
    const route = routeByPath.get(requestPath);

    if (!route) {
      json(response, 404, { ok: false, error: 'not_found' });
      return;
    }

    if (request.method !== 'POST') {
      json(response, 405, { ok: false, error: 'method_not_allowed' });
      return;
    }

    const actualSecret = readSecretHeader(request);
    if (!actualSecret || actualSecret !== route.webhookSecret) {
      json(response, 401, { ok: false, error: 'unauthorized' });
      return;
    }

    try {
      const body = await readBody(request, { maxBodyBytes, bodyTimeoutMs });
      const payload = body.trim().length > 0 ? (JSON.parse(body) as unknown) : {};
      await route.onUpdate(payload);
      json(response, 200, { ok: true });
    } catch (error) {
      if (error instanceof SyntaxError) {
        json(response, 400, { ok: false, error: 'invalid_json' });
        return;
      }
      if (error instanceof WebhookPayloadTooLargeError) {
        respondAndTerminateRequest(request, response, 413, {
          ok: false,
          error: 'payload_too_large',
        });
        return;
      }
      if (error instanceof WebhookBodyTimeoutError) {
        respondAndTerminateRequest(request, response, 408, {
          ok: false,
          error: 'request_timeout',
        });
        return;
      }
      if (error instanceof WebhookBodyReadError) {
        json(response, 400, { ok: false, error: 'bad_request_body' });
        return;
      }
      console.warn('[telegram-webhook-ingress] update handling failed', {
        accountId: route.accountId,
        error: error instanceof Error ? error.message : String(error),
      });
      json(response, 500, { ok: false, error: 'internal_error' });
    }
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(listenPort, listenHost);
  });

  return {
    stop: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};
