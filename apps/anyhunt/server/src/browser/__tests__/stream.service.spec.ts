/**
 * BrowserStreamService 单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { SessionManager } from '../session/session.manager';
import {
  BrowserStreamService,
  StreamNotConfiguredError,
} from '../streaming/stream.service';

describe('BrowserStreamService', () => {
  it('throws when streaming is not configured', () => {
    const service = new BrowserStreamService(
      {} as SessionManager,
      {} as ConfigService,
    );

    expect(() => service.createToken('session', 60)).toThrow(
      StreamNotConfiguredError,
    );
  });

  it('creates token when streaming is enabled', () => {
    const service = new BrowserStreamService(
      {} as SessionManager,
      {} as ConfigService,
    );

    (service as any).wss = {};
    (service as any).port = 9223;
    (service as any).host = 'localhost';

    const result = service.createToken('session', 60);
    const scheme = process.env.BROWSER_STREAM_SECURE === 'true' ? 'wss' : 'ws';
    expect(result.wsUrl).toContain(`${scheme}://localhost:9223`);
    expect(result.token).toBeDefined();
    expect(result.expiresAt).toBeGreaterThan(Date.now());
  });

  it('consumes token on connect', async () => {
    const service = new BrowserStreamService(
      {} as SessionManager,
      {} as ConfigService,
    );

    (service as any).wss = {};
    (service as any).port = 9223;
    (service as any).host = 'localhost';
    (service as any).maxClients = 1;

    const token = service.createToken('session-1', 60);

    const cdpSession = {
      send: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn().mockResolvedValue(undefined),
    };
    const stream = {
      sessionId: 'session-1',
      cdpSession,
      clients: new Set(),
      isScreencastActive: true,
    };
    (service as any).streams.set('session-1', stream);

    const ws = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      readyState: 1,
    };

    await (service as any).handleConnection(
      ws,
      `/browser/stream?token=${token.token}`,
    );

    expect((service as any).tokens.has(token.token)).toBe(false);
    expect(stream.clients.has(ws)).toBe(true);
  });

  it('rejects connection when max clients reached', async () => {
    const service = new BrowserStreamService(
      {} as SessionManager,
      {} as ConfigService,
    );

    (service as any).wss = {};
    (service as any).port = 9223;
    (service as any).host = 'localhost';
    (service as any).maxClients = 1;

    const token = service.createToken('session-1', 60);

    const cdpSession = {
      send: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn().mockResolvedValue(undefined),
    };
    const existingClient = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      readyState: 1,
    };
    const stream = {
      sessionId: 'session-1',
      cdpSession,
      clients: new Set([existingClient]),
      isScreencastActive: true,
    };
    (service as any).streams.set('session-1', stream);

    const ws = {
      send: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      readyState: 1,
    };

    await (service as any).handleConnection(
      ws,
      `/browser/stream?token=${token.token}`,
    );

    expect(ws.close).toHaveBeenCalled();
    expect(stream.clients.has(ws)).toBe(false);
  });

  it('cleans up tokens and streams for a session', async () => {
    const service = new BrowserStreamService(
      {} as SessionManager,
      {} as ConfigService,
    );

    const token = {
      token: 'token-1',
      sessionId: 'session-1',
      expiresAt: Date.now() + 60000,
    };
    (service as any).tokens.set(token.token, token);

    const client = { close: vi.fn() };
    const cdpSession = {
      send: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn().mockResolvedValue(undefined),
    };
    (service as any).streams.set('session-1', {
      sessionId: 'session-1',
      cdpSession,
      clients: new Set([client]),
      isScreencastActive: true,
    });

    await service.cleanupSession('session-1');

    expect((service as any).tokens.size).toBe(0);
    expect((service as any).streams.size).toBe(0);
    expect(client.close).toHaveBeenCalled();
    expect(cdpSession.detach).toHaveBeenCalled();
  });
});
