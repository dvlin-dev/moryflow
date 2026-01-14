/**
 * [INPUT]: callback, options (delay, onStart, onCancel)
 * [OUTPUT]: event handlers for long press detection
 * [POS]: Hook for detecting long press on mobile devices
 */

import { useCallback, useRef, useEffect } from 'react';

interface LongPressOptions {
  /** Long press delay in ms (default: 500) */
  delay?: number;
  /** Callback when press starts */
  onStart?: () => void;
  /** Callback when press is cancelled */
  onCancel?: () => void;
}

interface LongPressHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
}

/**
 * Hook for detecting long press gestures
 *
 * Works on both touch devices (mobile) and mouse (desktop)
 * Returns event handlers to attach to the target element
 */
export function useLongPress(
  callback: () => void,
  options: LongPressOptions = {}
): LongPressHandlers {
  const { delay = 500, onStart, onCancel } = options;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const start = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only respond to left mouse button
      if (e.type === 'mousedown' && (e as React.MouseEvent).button !== 0) {
        return;
      }

      // Store touch position for move detection
      if (e.type === 'touchstart') {
        const touch = (e as React.TouchEvent).touches[0];
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
      }

      onStart?.();

      timeoutRef.current = setTimeout(() => {
        callback();
        timeoutRef.current = null;
      }, delay);
    },
    [callback, delay, onStart]
  );

  const cancel = useCallback(() => {
    clear();
    onCancel?.();
    startPosRef.current = null;
  }, [clear, onCancel]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPosRef.current.y);

      // Cancel if moved more than 10px (user is scrolling)
      if (deltaX > 10 || deltaY > 10) {
        cancel();
      }
    },
    [cancel]
  );

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: handleTouchMove,
  };
}
