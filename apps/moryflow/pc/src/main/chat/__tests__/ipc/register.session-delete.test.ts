/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const registeredHandlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>());
const activeStreamsMock = vi.hoisted(() => {
  const entries = new Map<string, { sessionId?: string; cancel: () => Promise<void> | void }>();
  const registry = {
    entries,
    set: vi.fn(
      (channel: string, entry: { sessionId?: string; cancel: () => Promise<void> | void }) => {
        entries.set(channel, entry);
      }
    ),
    delete: vi.fn((channel: string) => {
      entries.delete(channel);
    }),
    stopChannel: vi.fn(async (channel: string) => {
      const entry = entries.get(channel);
      if (!entry) {
        return;
      }
      await entry.cancel();
      entries.delete(channel);
    }),
    stopSessionChannels: vi.fn(async (sessionId: string) => {
      const channels = [...entries.entries()]
        .filter(([, entry]) => entry.sessionId === sessionId)
        .map(([channel]) => channel);
      await Promise.all(channels.map((channel) => registry.stopChannel(channel)));
    }),
  };
  return registry;
});

const chatSessionStoreMock = vi.hoisted(() => ({
  delete: vi.fn(),
  list: vi.fn(() => []),
  create: vi.fn(),
  rename: vi.fn(),
  getUiMessages: vi.fn(() => []),
}));

const broadcastMock = vi.hoisted(() => ({
  broadcastMessageEvent: vi.fn(),
  broadcastSessionEvent: vi.fn(),
  broadcastToRenderers: vi.fn(),
  getCurrentMessageRevision: vi.fn(() => 0),
  getLatestMessageSnapshot: vi.fn(() => null),
}));

const approvalStoreMock = vi.hoisted(() => ({
  approveToolRequest: vi.fn(async () => ({ ok: true })),
  autoApprovePendingForSession: vi.fn(async () => undefined),
  clearApprovalGate: vi.fn(),
  consumeFullAccessUpgradePromptReminder: vi.fn(() => ({ shouldPrompt: false })),
  getApprovalContext: vi.fn(() => null),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      registeredHandlers.set(channel, handler);
    }),
  },
}));

vi.mock('../../../chat-session-store/index.js', () => ({
  chatSessionStore: chatSessionStoreMock,
}));

vi.mock('../../services/broadcast/event-bus.js', () => ({
  broadcastMessageEvent: broadcastMock.broadcastMessageEvent,
  broadcastSessionEvent: broadcastMock.broadcastSessionEvent,
  broadcastToRenderers: broadcastMock.broadcastToRenderers,
  getCurrentMessageRevision: broadcastMock.getCurrentMessageRevision,
  getLatestMessageSnapshot: broadcastMock.getLatestMessageSnapshot,
  subscribeSessionEvents: vi.fn(() => vi.fn()),
  subscribeMessageEvents: vi.fn(() => vi.fn()),
}));

vi.mock('../../services/approval/approval-gate-store.js', () => approvalStoreMock);

vi.mock('../../services/broadcast/search-index-subscriber.js', () => ({
  subscribeChatSessionSearchIndexSync: vi.fn(),
}));

vi.mock('../../ipc/register-agent-handlers.js', () => ({
  registerChatAgentHandlers: vi.fn(),
}));

vi.mock('../../services/active-stream-registry.js', () => ({
  createActiveStreamRegistry: vi.fn(() => activeStreamsMock),
}));

vi.mock('@moryflow/agents-tools', () => ({
  applyWriteOperation: vi.fn(),
  writeOperationSchema: {
    parse: (value: unknown) => value,
  },
}));

vi.mock('@moryflow/agents-runtime', () => ({
  createVaultUtils: vi.fn(() => ({})),
}));

vi.mock('../../../agent-runtime/runtime/desktop-adapter.js', () => ({
  createDesktopCapabilities: vi.fn(() => ({ fs: {} })),
  createDesktopCrypto: vi.fn(() => ({})),
}));

vi.mock('../../../vault.js', () => ({
  getStoredVault: vi.fn(async () => ({ path: '/tmp/vault' })),
}));

vi.mock('../../../chat-session-store/scope.js', () => ({
  resolveChatSessionProfileKey: vi.fn(async () => null),
  resolveCurrentChatSessionScope: vi.fn(async () => ({
    vaultPath: '/tmp/vault',
    profileKey: null,
  })),
}));

vi.mock('../../services/runtime.js', () => ({
  getRuntime: vi.fn(() => ({
    generateTitle: vi.fn(async () => 'title'),
    prepareCompaction: vi.fn(async () => ({ historyChanged: false })),
  })),
}));

vi.mock('../../../agent-runtime/index.js', () => ({
  createChatSession: vi.fn(() => ({})),
}));

vi.mock('../../../agent-runtime/permission/mode-audit.js', () => ({
  createDesktopModeSwitchAuditWriter: vi.fn(() => ({
    append: vi.fn(async () => undefined),
  })),
}));

vi.mock('../../../agent-runtime/runtime/runtime-config.js', () => ({
  getGlobalPermissionMode: vi.fn(async () => 'ask'),
  setGlobalPermissionMode: vi.fn(async () => ({
    changed: false,
    previousMode: 'ask',
    mode: 'ask',
  })),
}));

describe('registerChatHandlers session deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
    activeStreamsMock.entries.clear();
  });

  it('deletes the session only after cancelling its inflight channels', async () => {
    chatSessionStoreMock.list.mockReturnValue([{ id: 'session-a' }, { id: 'session-b' }]);
    const { registerChatHandlers } = await import('../../ipc/register.js');
    registerChatHandlers();

    const deleteHandler = registeredHandlers.get('chat:sessions:delete');
    expect(deleteHandler).toBeTypeOf('function');

    const events: string[] = [];
    const cancelDeletedSession = vi.fn(async () => {
      events.push('cancel:session-a');
    });
    const cancelOtherSession = vi.fn(async () => {
      events.push('cancel:session-b');
    });

    activeStreamsMock.entries.set('chat:session-a:1', {
      sessionId: 'session-a',
      cancel: cancelDeletedSession,
    });
    activeStreamsMock.entries.set('chat:session-b:1', {
      sessionId: 'session-b',
      cancel: cancelOtherSession,
    });
    chatSessionStoreMock.delete.mockImplementation(() => {
      events.push('delete:session-a');
    });

    await deleteHandler?.({}, { sessionId: 'session-a' });

    expect(cancelDeletedSession).toHaveBeenCalledTimes(1);
    expect(cancelOtherSession).not.toHaveBeenCalled();
    expect(chatSessionStoreMock.delete).toHaveBeenCalledWith('session-a');
    expect(events).toEqual(['cancel:session-a', 'delete:session-a']);
  });
});
