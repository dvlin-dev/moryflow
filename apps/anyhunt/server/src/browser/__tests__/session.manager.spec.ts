/**
 * SessionManager 单元测试
 *
 * 验证会话关闭时的资源清理
 */

import { describe, it, expect, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import {
  SessionManager,
  type BrowserSession,
  SessionOperationNotAllowedError,
} from '../session/session.manager';
import type { BrowserPool } from '../browser-pool';
import type { NetworkInterceptorService } from '../network/interceptor.service';
import type { SnapshotService } from '../snapshot/snapshot.service';
import type { BrowserDiagnosticsService } from '../diagnostics/diagnostics.service';

describe('SessionManager', () => {
  it('cleans up network interceptor and snapshot cache on close', async () => {
    const browserPool = {
      releaseContext: vi.fn().mockResolvedValue(undefined),
    } as unknown as BrowserPool;
    const networkInterceptor = {
      cleanupSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as NetworkInterceptorService;
    const snapshotService = {
      clearCache: vi.fn(),
    } as unknown as SnapshotService;
    const diagnosticsService = {
      registerPage: vi.fn(),
      cleanupSession: vi.fn(),
    } as unknown as BrowserDiagnosticsService;

    const manager = new SessionManager(
      browserPool,
      networkInterceptor,
      snapshotService,
      diagnosticsService,
    );

    const context = {} as BrowserContext;
    const page = {} as Page;
    const session: BrowserSession = {
      id: 'session-1',
      windows: [
        {
          context,
          page,
          pages: [page],
          activePageIndex: 0,
        },
      ],
      activeWindowIndex: 0,
      context,
      page,
      pages: [page],
      activePageIndex: 0,
      refs: new Map(),
      dialogHistory: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      lastAccessedAt: new Date(),
    };

    (
      manager as unknown as { sessions: Map<string, BrowserSession> }
    ).sessions.set('session-1', session);

    await manager.closeSession('session-1');

    expect(browserPool.releaseContext).toHaveBeenCalledWith(context);
    expect(networkInterceptor.cleanupSession).toHaveBeenCalledWith('session-1');
    expect(snapshotService.clearCache).toHaveBeenCalledWith('session-1');
    expect(diagnosticsService.cleanupSession).toHaveBeenCalledWith('session-1');

    await manager.onModuleDestroy();
  });

  it('throws SessionOperationNotAllowedError for invalid tab index', async () => {
    const manager = new SessionManager(
      {} as BrowserPool,
      {
        cleanupSession: vi.fn().mockResolvedValue(undefined),
      } as unknown as NetworkInterceptorService,
      { clearCache: vi.fn() } as unknown as SnapshotService,
      {
        registerPage: vi.fn(),
        cleanupSession: vi.fn(),
      } as unknown as BrowserDiagnosticsService,
    );

    const page = {
      isClosed: () => false,
      bringToFront: vi.fn().mockResolvedValue(undefined),
      title: vi.fn().mockResolvedValue(''),
      url: () => 'https://example.com',
    } as unknown as Page;
    const context = {} as BrowserContext;

    const session: BrowserSession = {
      id: 'session-1',
      windows: [
        {
          context,
          page,
          pages: [page],
          activePageIndex: 0,
        },
      ],
      activeWindowIndex: 0,
      context,
      page,
      pages: [page],
      activePageIndex: 0,
      refs: new Map(),
      dialogHistory: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      lastAccessedAt: new Date(),
    };

    (
      manager as unknown as { sessions: Map<string, BrowserSession> }
    ).sessions.set('session-1', session);

    await expect(manager.switchTab('session-1', -1)).rejects.toBeInstanceOf(
      SessionOperationNotAllowedError,
    );
  });

  it('throws SessionOperationNotAllowedError for invalid window index', async () => {
    const manager = new SessionManager(
      {} as BrowserPool,
      {
        cleanupSession: vi.fn().mockResolvedValue(undefined),
      } as unknown as NetworkInterceptorService,
      { clearCache: vi.fn() } as unknown as SnapshotService,
      {
        registerPage: vi.fn(),
        cleanupSession: vi.fn(),
      } as unknown as BrowserDiagnosticsService,
    );

    const page = {
      isClosed: () => false,
      url: () => 'https://example.com',
    } as unknown as Page;
    const context = {} as BrowserContext;

    const session: BrowserSession = {
      id: 'session-1',
      windows: [
        {
          context,
          page,
          pages: [page],
          activePageIndex: 0,
        },
      ],
      activeWindowIndex: 0,
      context,
      page,
      pages: [page],
      activePageIndex: 0,
      refs: new Map(),
      dialogHistory: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      lastAccessedAt: new Date(),
    };

    (
      manager as unknown as { sessions: Map<string, BrowserSession> }
    ).sessions.set('session-1', session);

    await expect(manager.switchWindow('session-1', -1)).rejects.toBeInstanceOf(
      SessionOperationNotAllowedError,
    );
  });
});
