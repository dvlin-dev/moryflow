import type { UIMessageChunk } from 'ai';
import { clearApprovalGate } from './approval/approval-gate-store.js';

export type ActiveStreamEntry = {
  sessionId: string;
  stream: ReadableStream<UIMessageChunk>;
  cancel: () => Promise<void> | void;
};

export type ActiveStreamRegistry = ReturnType<typeof createActiveStreamRegistry>;

export const createActiveStreamRegistry = () => {
  const entries = new Map<string, ActiveStreamEntry>();

  const stopChannel = async (channel: string) => {
    const entry = entries.get(channel);
    if (!entry) {
      return;
    }

    try {
      await entry.cancel();
    } finally {
      entries.delete(channel);
      clearApprovalGate(channel);
    }
  };

  const stopSessionChannels = async (sessionId: string) => {
    const channels = [...entries.entries()]
      .filter(([, entry]) => entry.sessionId === sessionId)
      .map(([channel]) => channel);

    await Promise.allSettled(channels.map((channel) => stopChannel(channel)));
  };

  return {
    entries,
    set: (channel: string, entry: ActiveStreamEntry) => {
      entries.set(channel, entry);
    },
    delete: (channel: string) => {
      entries.delete(channel);
    },
    stopChannel,
    stopSessionChannels,
  };
};
