/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAllWindowsMock = vi.hoisted(() => vi.fn(() => []));
const onSessionDeleteMock = vi.hoisted(() => vi.fn(async () => undefined));
const onSessionUpsertMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: getAllWindowsMock,
  },
}));

vi.mock('../../../../search-index/index.js', () => ({
  searchIndexService: {
    onSessionDelete: onSessionDeleteMock,
    onSessionUpsert: onSessionUpsertMock,
  },
}));

describe('chat event bus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('increments snapshot revisions and exposes the latest snapshot', async () => {
    const { broadcastMessageEvent, getCurrentMessageRevision, getLatestMessageSnapshot } =
      await import('../../../services/broadcast/event-bus.js');

    expect(getCurrentMessageRevision('session-1')).toBe(0);
    expect(getLatestMessageSnapshot('session-1')).toBeNull();

    const first = broadcastMessageEvent({
      type: 'snapshot',
      sessionId: 'session-1',
      messages: [{ id: 'm1', role: 'assistant', parts: [] }] as never[],
      persisted: false,
    });
    const second = broadcastMessageEvent({
      type: 'snapshot',
      sessionId: 'session-1',
      messages: [{ id: 'm2', role: 'assistant', parts: [] }] as never[],
      persisted: true,
    });

    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    expect(getCurrentMessageRevision('session-1')).toBe(2);
    expect(getLatestMessageSnapshot('session-1')).toEqual({
      revision: 2,
      messages: [{ id: 'm2', role: 'assistant', parts: [] }],
      persisted: true,
    });
  });

  it('notifies subscribers and clears cached snapshots on delete', async () => {
    const { broadcastMessageEvent, getLatestMessageSnapshot, subscribeMessageEvents } =
      await import('../../../services/broadcast/event-bus.js');

    const subscriber = vi.fn();
    const unsubscribe = subscribeMessageEvents(subscriber);

    broadcastMessageEvent({
      type: 'snapshot',
      sessionId: 'session-2',
      messages: [{ id: 'm1', role: 'assistant', parts: [] }] as never[],
      persisted: true,
    });
    const deletedEvent = broadcastMessageEvent({
      type: 'deleted',
      sessionId: 'session-2',
    });

    unsubscribe();

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith(deletedEvent);
    expect(getLatestMessageSnapshot('session-2')).toBeNull();
  });

  it('syncs session events into the search index without requiring handler registration', async () => {
    const { broadcastSessionEvent } = await import('../../../services/broadcast/event-bus.js');

    broadcastSessionEvent({
      type: 'updated',
      session: { id: 'session-sync' } as never,
    });
    broadcastSessionEvent({
      type: 'deleted',
      sessionId: 'session-sync',
    });

    await vi.waitFor(() => {
      expect(onSessionUpsertMock).toHaveBeenCalledWith('session-sync');
      expect(onSessionDeleteMock).toHaveBeenCalledWith('session-sync');
    });
  });
});
