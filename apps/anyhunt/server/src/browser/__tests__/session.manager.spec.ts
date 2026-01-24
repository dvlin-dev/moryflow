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
} from '../session/session.manager';
import type { BrowserPool } from '../browser-pool';
import type { NetworkInterceptorService } from '../network/interceptor.service';
import type { SnapshotService } from '../snapshot/snapshot.service';

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

    const manager = new SessionManager(
      browserPool,
      networkInterceptor,
      snapshotService,
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

    await manager.onModuleDestroy();
  });
});
