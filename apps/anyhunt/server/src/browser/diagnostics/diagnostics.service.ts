/**
 * Browser Diagnostics Service
 *
 * [INPUT]: Page/Context 事件、Trace 启停请求
 * [OUTPUT]: Console/Error/Trace 数据
 * [POS]: 统一管理浏览器调试与观测数据（内存态）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdirSync, promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { BrowserContext, Page } from 'playwright';

export interface ConsoleMessageRecord {
  type: string;
  text: string;
  timestamp: number;
}

export interface PageErrorRecord {
  message: string;
  timestamp: number;
}

export interface TraceStopResult {
  data?: string;
}

interface DiagnosticsState {
  consoleMessages: ConsoleMessageRecord[];
  pageErrors: PageErrorRecord[];
  tracing: boolean;
}

@Injectable()
export class BrowserDiagnosticsService {
  private readonly logger = new Logger(BrowserDiagnosticsService.name);
  private readonly states = new Map<string, DiagnosticsState>();
  private readonly MAX_LOGS = 200;
  private readonly TRACE_DIR = join(tmpdir(), 'anyhunt-browser-traces');

  registerPage(sessionId: string, page: Page): void {
    const state = this.getOrCreateState(sessionId);

    page.on('console', (message) => {
      state.consoleMessages.push({
        type: message.type(),
        text: message.text(),
        timestamp: Date.now(),
      });
      this.trimLogs(state.consoleMessages);
    });

    page.on('pageerror', (error) => {
      state.pageErrors.push({
        message: error.message,
        timestamp: Date.now(),
      });
      this.trimLogs(state.pageErrors);
    });
  }

  getConsoleMessages(
    sessionId: string,
    limit?: number,
  ): ConsoleMessageRecord[] {
    const state = this.states.get(sessionId);
    if (!state) return [];
    return this.sliceLogs(state.consoleMessages, limit);
  }

  clearConsoleMessages(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (state) {
      state.consoleMessages = [];
    }
  }

  getPageErrors(sessionId: string, limit?: number): PageErrorRecord[] {
    const state = this.states.get(sessionId);
    if (!state) return [];
    return this.sliceLogs(state.pageErrors, limit);
  }

  clearPageErrors(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (state) {
      state.pageErrors = [];
    }
  }

  async startTracing(
    sessionId: string,
    context: BrowserContext,
    options?: { screenshots?: boolean; snapshots?: boolean },
  ): Promise<void> {
    const state = this.getOrCreateState(sessionId);
    if (state.tracing) {
      this.logger.debug(`Tracing already active for session ${sessionId}`);
      return;
    }

    await context.tracing.start({
      screenshots: options?.screenshots ?? true,
      snapshots: options?.snapshots ?? true,
    });
    state.tracing = true;
  }

  async stopTracing(
    sessionId: string,
    context: BrowserContext,
    store: boolean,
  ): Promise<TraceStopResult> {
    const state = this.getOrCreateState(sessionId);
    if (!state.tracing) {
      return { data: undefined };
    }

    mkdirSync(this.TRACE_DIR, { recursive: true });
    const tracePath = join(
      this.TRACE_DIR,
      `trace-${sessionId}-${randomUUID()}.zip`,
    );

    await context.tracing.stop({ path: tracePath });
    state.tracing = false;

    let data: string | undefined;
    if (store) {
      const buffer = await fs.readFile(tracePath);
      data = buffer.toString('base64');
    }

    await fs.unlink(tracePath).catch(() => undefined);

    return { data };
  }

  cleanupSession(sessionId: string): void {
    this.states.delete(sessionId);
  }

  private getOrCreateState(sessionId: string): DiagnosticsState {
    const existing = this.states.get(sessionId);
    if (existing) return existing;
    const state: DiagnosticsState = {
      consoleMessages: [],
      pageErrors: [],
      tracing: false,
    };
    this.states.set(sessionId, state);
    return state;
  }

  private trimLogs<T>(logs: T[]): void {
    if (logs.length <= this.MAX_LOGS) return;
    logs.splice(0, logs.length - this.MAX_LOGS);
  }

  private sliceLogs<T>(logs: T[], limit?: number): T[] {
    if (!limit || limit <= 0) {
      return [...logs];
    }
    return logs.slice(-limit);
  }
}
