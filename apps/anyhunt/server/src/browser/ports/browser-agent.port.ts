/**
 * Browser Agent Port
 *
 * [PROVIDES]: Agent-facing browser operations (no Playwright types)
 * [DEPENDS]: browser-session.service.ts
 * [POS]: Browser -> Agent ports/facade boundary to isolate heavy types
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import { BrowserSessionService } from '../browser-session.service';
import type {
  CreateSessionInput,
  OpenUrlInput,
  SnapshotInput,
  SnapshotResponse,
  ActionInput,
  ActionResponse,
} from '../dto';

/** Agent 侧会话句柄（避免透传 Playwright 类型） */
export interface BrowserAgentSession {
  id: string;
  createdAt: string;
  expiresAt: string;
}

/** Agent 搜索结果 */
export interface BrowserAgentSearchResult {
  url: string;
  snapshot: SnapshotResponse;
}

/** Agent 使用的 Browser 端口 */
export interface BrowserAgentPort {
  createSession(
    options?: Partial<CreateSessionInput>,
  ): Promise<BrowserAgentSession>;
  closeSession(sessionId: string): Promise<void>;
  openUrl(
    sessionId: string,
    input: OpenUrlInput,
  ): Promise<{
    success: boolean;
    url: string;
    title: string | null;
  }>;
  snapshot(
    sessionId: string,
    options?: Partial<SnapshotInput>,
  ): Promise<SnapshotResponse>;
  executeAction(
    sessionId: string,
    action: ActionInput,
  ): Promise<ActionResponse>;
  search(sessionId: string, query: string): Promise<BrowserAgentSearchResult>;
}

@Injectable()
export class BrowserAgentPortService implements BrowserAgentPort {
  constructor(private readonly sessionService: BrowserSessionService) {}

  async createSession(
    options?: Partial<CreateSessionInput>,
  ): Promise<BrowserAgentSession> {
    const session = await this.sessionService.createSession(options);
    return {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.sessionService.closeSession(sessionId);
  }

  async openUrl(
    sessionId: string,
    input: OpenUrlInput,
  ): Promise<{ success: boolean; url: string; title: string | null }> {
    return this.sessionService.openUrl(sessionId, input);
  }

  async snapshot(
    sessionId: string,
    options?: Partial<SnapshotInput>,
  ): Promise<SnapshotResponse> {
    return this.sessionService.getSnapshot(sessionId, options);
  }

  async executeAction(
    sessionId: string,
    action: ActionInput,
  ): Promise<ActionResponse> {
    return this.sessionService.executeAction(sessionId, action);
  }

  async search(
    sessionId: string,
    query: string,
  ): Promise<BrowserAgentSearchResult> {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const openResult = await this.sessionService.openUrl(sessionId, {
      url: searchUrl,
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const snapshot = await this.sessionService.getSnapshot(sessionId, {
      interactive: true,
    });

    return {
      url: openResult.url,
      snapshot,
    };
  }
}
