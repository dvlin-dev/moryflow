import http from 'node:http';
import net from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startTelegramWebhookIngress } from './webhook-ingress.js';

const reservePort = async (): Promise<number> => {
  return await new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('failed to reserve port')));
        return;
      }
      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
};

const request = async (input: {
  port: number;
  path: string;
  method?: 'POST' | 'GET';
  secret?: string;
  payload?: unknown;
}): Promise<{ statusCode: number; body: string }> => {
  return await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: input.port,
        path: input.path,
        method: input.method ?? 'POST',
        headers: {
          'content-type': 'application/json',
          ...(input.secret ? { 'x-telegram-bot-api-secret-token': input.secret } : {}),
        },
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body,
          });
        });
      }
    );
    req.once('error', reject);
    if (input.payload !== undefined) {
      req.write(JSON.stringify(input.payload));
    }
    req.end();
  });
};

describe('telegram webhook ingress', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('校验 path/secret/method 并把合法 update 分发到 runtime', async () => {
    const port = await reservePort();
    const onUpdate = vi.fn(async () => undefined);

    const ingress = await startTelegramWebhookIngress({
      routes: [
        {
          accountId: 'default',
          webhookPath: '/telegram/webhook/default',
          webhookSecret: 'sec_1',
          onUpdate,
        },
      ],
      listenPort: port,
    });

    try {
      const wrongMethod = await request({
        port,
        path: '/telegram/webhook/default',
        method: 'GET',
      });
      expect(wrongMethod.statusCode).toBe(405);

      const wrongPath = await request({
        port,
        path: '/telegram/webhook/other',
        secret: 'sec_1',
        payload: { update_id: 1 },
      });
      expect(wrongPath.statusCode).toBe(404);

      const wrongSecret = await request({
        port,
        path: '/telegram/webhook/default',
        secret: 'bad_secret',
        payload: { update_id: 2 },
      });
      expect(wrongSecret.statusCode).toBe(401);
      expect(onUpdate).toHaveBeenCalledTimes(0);

      const valid = await request({
        port,
        path: '/telegram/webhook/default',
        secret: 'sec_1',
        payload: { update_id: 3, message: { text: 'hi' } },
      });
      expect(valid.statusCode).toBe(200);
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith({ update_id: 3, message: { text: 'hi' } });
    } finally {
      await ingress.stop();
    }
  });

  it('同一监听端口支持多个 webhook path 路由到不同账号处理器', async () => {
    const port = await reservePort();
    const onUpdateA = vi.fn(async () => undefined);
    const onUpdateB = vi.fn(async () => undefined);

    const ingress = await startTelegramWebhookIngress({
      routes: [
        {
          accountId: 'a',
          webhookPath: '/telegram/webhook/a',
          webhookSecret: 'sec_a',
          onUpdate: onUpdateA,
        },
        {
          accountId: 'b',
          webhookPath: '/telegram/webhook/b',
          webhookSecret: 'sec_b',
          onUpdate: onUpdateB,
        },
      ],
      listenPort: port,
    });

    try {
      const responseA = await request({
        port,
        path: '/telegram/webhook/a',
        secret: 'sec_a',
        payload: { update_id: 101 },
      });
      const responseB = await request({
        port,
        path: '/telegram/webhook/b',
        secret: 'sec_b',
        payload: { update_id: 202 },
      });
      expect(responseA.statusCode).toBe(200);
      expect(responseB.statusCode).toBe(200);
      expect(onUpdateA).toHaveBeenCalledTimes(1);
      expect(onUpdateA).toHaveBeenCalledWith({ update_id: 101 });
      expect(onUpdateB).toHaveBeenCalledTimes(1);
      expect(onUpdateB).toHaveBeenCalledWith({ update_id: 202 });
    } finally {
      await ingress.stop();
    }
  });

  it('超限 payload 返回 413，避免无效 500 重试', async () => {
    const port = await reservePort();
    const onUpdate = vi.fn(async () => undefined);

    const ingress = await startTelegramWebhookIngress({
      routes: [
        {
          accountId: 'default',
          webhookPath: '/telegram/webhook/default',
          webhookSecret: 'sec_2',
          onUpdate,
        },
      ],
      listenPort: port,
      maxBodyBytes: 64,
    });

    try {
      const oversized = await request({
        port,
        path: '/telegram/webhook/default',
        secret: 'sec_2',
        payload: {
          update_id: 999,
          message: {
            text: 'x'.repeat(512),
          },
        },
      });
      expect(oversized.statusCode).toBe(413);
      expect(onUpdate).toHaveBeenCalledTimes(0);
    } finally {
      await ingress.stop();
    }
  });

  it('超限 payload 会主动断开连接，避免持续网络缓冲', async () => {
    const port = await reservePort();
    const onUpdate = vi.fn(async () => undefined);

    const ingress = await startTelegramWebhookIngress({
      routes: [
        {
          accountId: 'default',
          webhookPath: '/telegram/webhook/default',
          webhookSecret: 'sec_3',
          onUpdate,
        },
      ],
      listenPort: port,
      maxBodyBytes: 64,
      bodyTimeoutMs: 5_000,
    });

    try {
      const socket = net.createConnection({
        host: '127.0.0.1',
        port,
      });

      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('error', reject);
      });

      const requestHead = [
        'POST /telegram/webhook/default HTTP/1.1',
        'Host: 127.0.0.1',
        'Content-Type: application/json',
        'X-Telegram-Bot-Api-Secret-Token: sec_3',
        'Content-Length: 100000',
        '',
        '',
      ].join('\r\n');

      const oversizedChunk = `{"update_id":1,"message":{"text":"${'x'.repeat(256)}"}}`;

      const closedQuickly = new Promise<boolean>((resolve) => {
        socket.once('close', () => resolve(true));
      });
      // Consume response bytes to avoid paused-socket mode hiding close events.
      socket.on('data', () => undefined);

      socket.write(requestHead);
      socket.write(oversizedChunk);

      await expect(
        Promise.race([
          closedQuickly,
          new Promise<boolean>((_, reject) => {
            setTimeout(() => {
              reject(new Error('socket should close quickly for oversized payload'));
            }, 800);
          }),
        ])
      ).resolves.toBe(true);

      expect(onUpdate).toHaveBeenCalledTimes(0);
      socket.destroy();
    } finally {
      await ingress.stop();
    }
  });
});
