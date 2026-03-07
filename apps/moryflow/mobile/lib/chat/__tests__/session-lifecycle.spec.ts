/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { deleteSessionWithLifecycle, useStopCurrentSessionOnChange } from '../session-lifecycle';

describe('mobile chat session lifecycle', () => {
  it('stops the active session before deleting it', async () => {
    const order: string[] = [];
    const stop = vi.fn(async () => {
      order.push('stop');
    });
    const deleteSession = vi.fn(async () => {
      order.push('delete');
    });

    await deleteSessionWithLifecycle({
      sessionId: 'session-a',
      activeSessionId: 'session-a',
      stop,
      deleteSession,
    });

    expect(stop).toHaveBeenCalledTimes(1);
    expect(deleteSession).toHaveBeenCalledWith('session-a');
    expect(order).toEqual(['stop', 'delete']);
  });

  it('does not stop when deleting an inactive session', async () => {
    const stop = vi.fn();
    const deleteSession = vi.fn(async () => undefined);

    await deleteSessionWithLifecycle({
      sessionId: 'session-b',
      activeSessionId: 'session-a',
      stop,
      deleteSession,
    });

    expect(stop).not.toHaveBeenCalled();
    expect(deleteSession).toHaveBeenCalledWith('session-b');
  });

  it('stops the previous session when the active session changes', () => {
    const stopSessionA = vi.fn();
    const stopSessionB = vi.fn();

    const { rerender } = renderHook(
      ({ activeSessionId, stop }) => useStopCurrentSessionOnChange(activeSessionId, stop),
      {
        initialProps: {
          activeSessionId: 'session-a' as string | null,
          stop: stopSessionA,
        },
      }
    );

    act(() => {
      rerender({
        activeSessionId: 'session-b',
        stop: stopSessionB,
      });
    });

    expect(stopSessionA).toHaveBeenCalledTimes(1);
    expect(stopSessionB).not.toHaveBeenCalled();
  });
});
