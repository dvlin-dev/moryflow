/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const onSessionDeleteMock = vi.hoisted(() => vi.fn(async () => undefined));
const onSessionUpsertMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('../../../../search-index/index.js', () => ({
  searchIndexService: {
    onSessionDelete: onSessionDeleteMock,
    onSessionUpsert: onSessionUpsertMock,
  },
}));

describe('search index chat subscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs session upsert and delete events into the search index service', async () => {
    const { handleChatSessionSearchIndexSync } =
      await import('../../../services/broadcast/search-index-subscriber.js');

    await handleChatSessionSearchIndexSync({
      type: 'updated',
      session: { id: 'session-a' } as never,
    });
    await handleChatSessionSearchIndexSync({
      type: 'deleted',
      sessionId: 'session-a',
    });

    expect(onSessionUpsertMock).toHaveBeenCalledWith('session-a');
    expect(onSessionDeleteMock).toHaveBeenCalledWith('session-a');
  });
});
