/**
 * [PROVIDES]: Streaming 状态 + WebSocket 管理 + 输入事件处理
 * [DEPENDS]: BrowserStream* 类型
 * [POS]: Agent Browser Playground 的 Streaming 行为封装（断开清理 frame）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import type { BrowserStreamFrame, BrowserStreamStatus, BrowserStreamTokenResult } from '../types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getModifiers = (event: {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}) => {
  let modifiers = 0;
  if (event.altKey) modifiers |= 1;
  if (event.ctrlKey) modifiers |= 2;
  if (event.metaKey) modifiers |= 4;
  if (event.shiftKey) modifiers |= 8;
  return modifiers;
};

const mapMouseButton = (button: number) => {
  switch (button) {
    case 0:
      return 'left';
    case 1:
      return 'middle';
    case 2:
      return 'right';
    default:
      return 'none';
  }
};

export type BrowserStreamHandlers = {
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onKeyUp: (event: KeyboardEvent<HTMLDivElement>) => void;
};

export const useBrowserStream = () => {
  const [streamToken, setStreamToken] = useState<BrowserStreamTokenResult | null>(null);
  const [streamStatus, setStreamStatus] = useState<BrowserStreamStatus | null>(null);
  const [streamFrame, setStreamFrame] = useState<BrowserStreamFrame | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamSocketRef = useRef<WebSocket | null>(null);
  const streamImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!streamToken?.wsUrl) return;

    const ws = new WebSocket(streamToken.wsUrl);
    streamSocketRef.current = ws;

    ws.onopen = () => {
      setStreamStatus({ connected: true, screencasting: false });
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          type?: string;
          connected?: boolean;
          screencasting?: boolean;
          data?: string;
          metadata?: Record<string, unknown>;
        };
        if (payload.type === 'status') {
          setStreamStatus({
            connected: Boolean(payload.connected),
            screencasting: Boolean(payload.screencasting),
          });
        }
        if (payload.type === 'frame' && payload.data) {
          setStreamFrame({ data: payload.data, metadata: payload.metadata });
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      setStreamError('Streaming connection error');
    };

    ws.onclose = () => {
      setStreamStatus((prev) =>
        prev ? { ...prev, connected: false } : { connected: false, screencasting: false }
      );
      setStreamFrame(null);
    };

    return () => {
      ws.close();
    };
  }, [streamToken?.wsUrl]);

  useEffect(() => {
    return () => {
      streamSocketRef.current?.close();
    };
  }, []);

  const resetStream = useCallback(() => {
    if (streamSocketRef.current) {
      streamSocketRef.current.close();
      streamSocketRef.current = null;
    }
    setStreamToken(null);
    setStreamStatus(null);
    setStreamFrame(null);
    setStreamError(null);
  }, []);

  const sendStreamMessage = useCallback((message: Record<string, unknown>) => {
    const ws = streamSocketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(message));
  }, []);

  const resolveStreamCoordinates = useCallback(
    (target: HTMLElement, clientX: number, clientY: number) => {
      const rect =
        streamImageRef.current?.getBoundingClientRect() ?? target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const rawX = clamp(clientX - rect.left, 0, rect.width);
      const rawY = clamp(clientY - rect.top, 0, rect.height);

      const metadata = streamFrame?.metadata ?? {};
      const targetWidth =
        (typeof metadata.deviceWidth === 'number' && metadata.deviceWidth) ||
        (typeof metadata.width === 'number' && metadata.width) ||
        rect.width;
      const targetHeight =
        (typeof metadata.deviceHeight === 'number' && metadata.deviceHeight) ||
        (typeof metadata.height === 'number' && metadata.height) ||
        rect.height;

      return {
        x: (rawX / rect.width) * targetWidth,
        y: (rawY / rect.height) * targetHeight,
      };
    },
    [streamFrame]
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!streamFrame) return;
      const coords = resolveStreamCoordinates(event.currentTarget, event.clientX, event.clientY);
      if (!coords) return;
      event.currentTarget.focus();
      sendStreamMessage({
        type: 'input_mouse',
        eventType: 'mousePressed',
        x: coords.x,
        y: coords.y,
        button: mapMouseButton(event.button),
        clickCount: 1,
        modifiers: getModifiers(event),
      });
    },
    [resolveStreamCoordinates, sendStreamMessage, streamFrame]
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!streamFrame) return;
      const coords = resolveStreamCoordinates(event.currentTarget, event.clientX, event.clientY);
      if (!coords) return;
      sendStreamMessage({
        type: 'input_mouse',
        eventType: 'mouseReleased',
        x: coords.x,
        y: coords.y,
        button: mapMouseButton(event.button),
        clickCount: 1,
        modifiers: getModifiers(event),
      });
    },
    [resolveStreamCoordinates, sendStreamMessage, streamFrame]
  );

  const onWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      if (!streamFrame) return;
      const coords = resolveStreamCoordinates(event.currentTarget, event.clientX, event.clientY);
      if (!coords) return;
      event.preventDefault();
      sendStreamMessage({
        type: 'input_mouse',
        eventType: 'mouseWheel',
        x: coords.x,
        y: coords.y,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        modifiers: getModifiers(event),
      });
    },
    [resolveStreamCoordinates, sendStreamMessage, streamFrame]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      sendStreamMessage({
        type: 'input_keyboard',
        eventType: 'keyDown',
        key: event.key,
        code: event.code,
        modifiers: getModifiers(event),
      });
      if (event.key.length === 1) {
        sendStreamMessage({
          type: 'input_keyboard',
          eventType: 'char',
          text: event.key,
          modifiers: getModifiers(event),
        });
      }
    },
    [sendStreamMessage]
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      sendStreamMessage({
        type: 'input_keyboard',
        eventType: 'keyUp',
        key: event.key,
        code: event.code,
        modifiers: getModifiers(event),
      });
    },
    [sendStreamMessage]
  );

  const handlers: BrowserStreamHandlers = {
    onPointerDown,
    onPointerUp,
    onWheel,
    onKeyDown,
    onKeyUp,
  };

  return {
    streamToken,
    setStreamToken,
    streamStatus,
    streamFrame,
    streamError,
    setStreamError,
    streamImageRef,
    resetStream,
    handlers,
  };
};
