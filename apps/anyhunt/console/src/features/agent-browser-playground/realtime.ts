/**
 * [PROVIDES]: createBrowserStreamConnection
 * [DEPENDS]: BrowserStreamFrame/BrowserStreamStatus types
 * [POS]: Agent Browser Playground 实时通道入口（WebSocket）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { BrowserStreamFrame, BrowserStreamStatus } from './types';

type StreamMessagePayload = {
  type?: string;
  connected?: boolean;
  screencasting?: boolean;
  data?: string;
  metadata?: Record<string, unknown>;
};

export interface BrowserStreamConnectionHandlers {
  onOpen?: () => void;
  onStatus?: (status: BrowserStreamStatus) => void;
  onFrame?: (frame: BrowserStreamFrame) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface BrowserStreamConnection {
  close: () => void;
  send: (message: Record<string, unknown>) => void;
}

export function createBrowserStreamConnection(
  wsUrl: string,
  handlers: BrowserStreamConnectionHandlers
): BrowserStreamConnection {
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    handlers.onOpen?.();
    handlers.onStatus?.({ connected: true, screencasting: false });
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data as string) as StreamMessagePayload;
      if (payload.type === 'status') {
        handlers.onStatus?.({
          connected: Boolean(payload.connected),
          screencasting: Boolean(payload.screencasting),
        });
      }

      if (payload.type === 'frame' && payload.data) {
        handlers.onFrame?.({ data: payload.data, metadata: payload.metadata });
      }
    } catch {
      // ignore malformed messages
    }
  };

  socket.onerror = () => {
    handlers.onError?.('Streaming connection error');
  };

  socket.onclose = () => {
    handlers.onClose?.();
  };

  return {
    close: () => {
      socket.close();
    },
    send: (message) => {
      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }
      socket.send(JSON.stringify(message));
    },
  };
}
