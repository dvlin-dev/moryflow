/**
 * Browser Stream Service
 *
 * [INPUT]: Stream token 请求 + WebSocket 消息
 * [OUTPUT]: Screencast 帧 + 输入事件注入
 * [POS]: 浏览器流式预览与人机协作入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { CDPSession } from 'playwright';
import { SessionManager } from '../session';
import {
  BROWSER_STREAM_MAX_CLIENTS,
  BROWSER_STREAM_SECURE,
} from '../browser.constants';

interface StreamToken {
  token: string;
  sessionId: string;
  expiresAt: number;
}

interface StreamSession {
  sessionId: string;
  cdpSession: CDPSession;
  clients: Set<WebSocket>;
  isScreencastActive: boolean;
}

type InputMouseEventType =
  | 'mousePressed'
  | 'mouseReleased'
  | 'mouseMoved'
  | 'mouseWheel';

type InputKeyEventType = 'keyDown' | 'keyUp' | 'rawKeyDown' | 'char';

type InputTouchEventType =
  | 'touchStart'
  | 'touchEnd'
  | 'touchMove'
  | 'touchCancel';

type InputMouseMessage = {
  type: 'input_mouse';
  eventType: InputMouseEventType;
  x: number;
  y: number;
  button?: 'none' | 'left' | 'middle' | 'right' | 'back' | 'forward';
  clickCount?: number;
  deltaX?: number;
  deltaY?: number;
  modifiers?: number;
};

type InputKeyboardMessage = {
  type: 'input_keyboard';
  eventType: InputKeyEventType;
  key?: string;
  code?: string;
  text?: string;
  modifiers?: number;
};

type InputTouchMessage = {
  type: 'input_touch';
  eventType: InputTouchEventType;
  touchPoints: Array<{
    x: number;
    y: number;
    radiusX?: number;
    radiusY?: number;
    rotationAngle?: number;
    force?: number;
    id?: number;
  }>;
  modifiers?: number;
};

type StreamMessage =
  | InputMouseMessage
  | InputKeyboardMessage
  | InputTouchMessage;

export class StreamNotConfiguredError extends Error {
  constructor() {
    super('Browser streaming is disabled. Configure BROWSER_STREAM_PORT.');
    this.name = 'StreamNotConfiguredError';
  }
}

@Injectable()
export class BrowserStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserStreamService.name);
  private wss: WebSocketServer | null = null;
  private readonly tokens = new Map<string, StreamToken>();
  private readonly streams = new Map<string, StreamSession>();
  private port = 0;
  private host = 'localhost';
  private maxClients = 1;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 30 * 1000;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.port = parseInt(
      this.configService.get<string>('BROWSER_STREAM_PORT', '0'),
      10,
    );
    this.host = this.configService.get<string>(
      'BROWSER_STREAM_HOST',
      'localhost',
    );
    this.maxClients = BROWSER_STREAM_MAX_CLIENTS;

    if (Number.isNaN(this.port) || this.port <= 0) {
      this.logger.debug(
        'Browser streaming disabled (BROWSER_STREAM_PORT not set)',
      );
      return;
    }

    this.wss = new WebSocketServer({ host: this.host, port: this.port });
    this.wss.on('connection', (ws, request) => {
      void this.handleConnection(ws, request.url ?? '').catch((error) => {
        this.logger.warn(`Stream connection error: ${error}`);
      });
    });
    this.wss.on('listening', () => {
      this.logger.log(`Browser stream server listening on port ${this.port}`);
    });
    this.wss.on('error', (error) => {
      this.logger.error(`Browser stream server error: ${error}`);
    });

    this.startCleanupTimer();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    for (const sessionId of Array.from(this.streams.keys())) {
      await this.disposeStream(sessionId);
    }

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss?.close(() => resolve());
      });
      this.wss = null;
    }
  }

  createToken(
    sessionId: string,
    expiresInSeconds: number,
  ): {
    token: string;
    wsUrl: string;
    expiresAt: number;
  } {
    if (!this.wss || this.port <= 0) {
      throw new StreamNotConfiguredError();
    }

    const token = randomUUID();
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    this.tokens.set(token, {
      token,
      sessionId,
      expiresAt,
    });

    const protocol = BROWSER_STREAM_SECURE ? 'wss' : 'ws';
    return {
      token,
      wsUrl: `${protocol}://${this.host}:${this.port}/browser/stream?token=${token}`,
      expiresAt,
    };
  }

  async cleanupSession(sessionId: string): Promise<void> {
    this.cleanupTokensForSession(sessionId);
    await this.disposeStream(sessionId);
  }

  private async handleConnection(ws: WebSocket, url: string): Promise<void> {
    const token = this.extractToken(url);
    if (!token) {
      ws.close();
      return;
    }

    const tokenInfo = this.tokens.get(token);
    if (!tokenInfo || tokenInfo.expiresAt < Date.now()) {
      if (tokenInfo) {
        this.tokens.delete(token);
      }
      ws.close();
      return;
    }
    this.tokens.delete(token);

    const stream = await this.ensureStream(tokenInfo.sessionId).catch(
      () => null,
    );
    if (!stream) {
      ws.close();
      return;
    }
    if (stream.clients.size >= this.maxClients) {
      ws.close();
      return;
    }

    stream.clients.add(ws);
    await this.startScreencast(stream);
    this.sendStatus(ws, stream);

    ws.on('message', (data: RawData) => {
      const raw = this.toRawMessage(data);
      if (!raw) {
        return;
      }
      this.handleMessage(stream, raw).catch((error) => {
        this.logger.warn(`Stream input error: ${error}`);
      });
    });

    ws.on('close', () => {
      stream.clients.delete(ws);
      if (stream.clients.size === 0) {
        this.disposeStream(stream.sessionId).catch(() => undefined);
      }
    });
  }

  private extractToken(url: string): string | null {
    try {
      const parsed = new URL(url, `http://${this.host}:${this.port}`);
      const token = parsed.searchParams.get('token');
      return token ?? null;
    } catch {
      return null;
    }
  }

  private async ensureStream(sessionId: string): Promise<StreamSession> {
    const existing = this.streams.get(sessionId);
    if (existing) return existing;

    const session = this.sessionManager.getSession(sessionId);
    const context = this.sessionManager.getActiveContext(session);
    const page = this.sessionManager.getActivePage(session);
    const cdpSession = await context.newCDPSession(page);

    const stream: StreamSession = {
      sessionId,
      cdpSession,
      clients: new Set(),
      isScreencastActive: false,
    };

    cdpSession.on('Page.screencastFrame', (payload) => {
      const message = JSON.stringify({
        type: 'frame',
        data: payload.data,
        metadata: payload.metadata,
      });

      for (const client of stream.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }

      cdpSession
        .send('Page.screencastFrameAck', { sessionId: payload.sessionId })
        .catch(() => undefined);
    });

    this.streams.set(sessionId, stream);
    return stream;
  }

  private async startScreencast(stream: StreamSession): Promise<void> {
    if (stream.isScreencastActive) return;

    const session = this.sessionManager.getSession(stream.sessionId);
    const page = this.sessionManager.getActivePage(session);
    const viewport = page.viewportSize() ?? {
      width: 1280,
      height: 720,
    };

    await stream.cdpSession.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: viewport.width,
      maxHeight: viewport.height,
    });

    stream.isScreencastActive = true;
  }

  private async stopScreencast(stream: StreamSession): Promise<void> {
    if (!stream.isScreencastActive) return;

    await stream.cdpSession.send('Page.stopScreencast').catch(() => undefined);
    stream.isScreencastActive = false;
  }

  private async disposeStream(sessionId: string): Promise<void> {
    const stream = this.streams.get(sessionId);
    if (!stream) return;

    this.streams.delete(sessionId);

    for (const client of stream.clients) {
      client.close();
    }

    await this.stopScreencast(stream).catch(() => undefined);
    await stream.cdpSession.detach().catch(() => undefined);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredTokens();
      this.cleanupOrphanStreams().catch((error) => {
        this.logger.warn(`Stream cleanup error: ${error}`);
      });
    }, this.CLEANUP_INTERVAL_MS);
  }

  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, info] of this.tokens) {
      if (info.expiresAt <= now) {
        this.tokens.delete(token);
      }
    }
  }

  private cleanupTokensForSession(sessionId: string): void {
    for (const [token, info] of this.tokens) {
      if (info.sessionId === sessionId) {
        this.tokens.delete(token);
      }
    }
  }

  private async cleanupOrphanStreams(): Promise<void> {
    for (const [sessionId, stream] of this.streams) {
      if (stream.clients.size === 0) {
        await this.disposeStream(sessionId);
        continue;
      }

      try {
        this.sessionManager.getSession(sessionId);
      } catch {
        await this.disposeStream(sessionId);
      }
    }
  }

  private sendStatus(ws: WebSocket, stream: StreamSession): void {
    ws.send(
      JSON.stringify({
        type: 'status',
        connected: true,
        screencasting: stream.isScreencastActive,
      }),
    );
  }

  private async handleMessage(
    stream: StreamSession,
    raw: string,
  ): Promise<void> {
    let message: StreamMessage;
    try {
      message = JSON.parse(raw) as StreamMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case 'input_mouse':
        await stream.cdpSession.send('Input.dispatchMouseEvent', {
          type: message.eventType,
          x: message.x,
          y: message.y,
          button: message.button,
          clickCount: message.clickCount,
          deltaX: message.deltaX,
          deltaY: message.deltaY,
          modifiers: message.modifiers,
        });
        break;
      case 'input_keyboard':
        await stream.cdpSession.send('Input.dispatchKeyEvent', {
          type: message.eventType,
          key: message.key,
          code: message.code,
          text: message.text,
          modifiers: message.modifiers,
        });
        break;
      case 'input_touch':
        await stream.cdpSession.send('Input.dispatchTouchEvent', {
          type: message.eventType,
          touchPoints: message.touchPoints,
          modifiers: message.modifiers,
        });
        break;
      default:
        break;
    }
  }

  private toRawMessage(data: RawData): string | null {
    if (typeof data === 'string') {
      return data;
    }
    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }
    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString('utf8');
    }
    return null;
  }
}
