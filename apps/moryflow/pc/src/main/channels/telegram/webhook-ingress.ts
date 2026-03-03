/**
 * [INPUT]: webhook URL + secret + update handler
 * [OUTPUT]: 本地 webhook ingress（start/stop）
 * [POS]: Telegram webhook 入站接收边界（主进程）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
        request.destroy();
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

export type TelegramWebhookIngressHandle = {
  stop: () => Promise<void>;
};

export const startTelegramWebhookIngress = async (input: {
  accountId: string;
  webhookPath: string;
  webhookSecret: string;
  listenHost?: string;
  listenPort?: number;
  maxBodyBytes?: number;
  bodyTimeoutMs?: number;
  onUpdate: (update: unknown) => Promise<void>;
}): Promise<TelegramWebhookIngressHandle> => {
  const expectedPath = normalizePath(input.webhookPath);
  const expectedSecret = input.webhookSecret;
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

    if (requestPath !== expectedPath) {
      json(response, 404, { ok: false, error: 'not_found' });
      return;
    }

    if (request.method !== 'POST') {
      json(response, 405, { ok: false, error: 'method_not_allowed' });
      return;
    }

    const actualSecret = readSecretHeader(request);
    if (!actualSecret || actualSecret !== expectedSecret) {
      json(response, 401, { ok: false, error: 'unauthorized' });
      return;
    }

    try {
      const body = await readBody(request, { maxBodyBytes, bodyTimeoutMs });
      const payload = body.trim().length > 0 ? (JSON.parse(body) as unknown) : {};
      await input.onUpdate(payload);
      json(response, 200, { ok: true });
    } catch (error) {
      if (error instanceof SyntaxError) {
        json(response, 400, { ok: false, error: 'invalid_json' });
        return;
      }
      if (error instanceof WebhookPayloadTooLargeError) {
        json(response, 413, { ok: false, error: 'payload_too_large' });
        return;
      }
      if (error instanceof WebhookBodyTimeoutError) {
        json(response, 408, { ok: false, error: 'request_timeout' });
        return;
      }
      if (error instanceof WebhookBodyReadError) {
        json(response, 400, { ok: false, error: 'bad_request_body' });
        return;
      }
      console.warn('[telegram-webhook-ingress] update handling failed', {
        accountId: input.accountId,
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
