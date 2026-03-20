/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const registeredHandlers = vi.hoisted(() => new Map<string, (...args: any[]) => any>());

const chatSessionStoreMock = vi.hoisted(() => ({
  list: vi.fn(() => []),
  delete: vi.fn(),
  fork: vi.fn(),
  getUiMessages: vi.fn(() => []),
}));

const approvalStoreMock = vi.hoisted(() => ({
  approveToolRequest: vi.fn(async () => ({ ok: true })),
  autoApprovePendingForSession: vi.fn(async () => undefined),
  clearApprovalGate: vi.fn(),
  consumeFullAccessUpgradePromptReminder: vi.fn(() => ({ shouldPrompt: false })),
  getApprovalContext: vi.fn(() => null),
}));

const broadcastMock = vi.hoisted(() => ({
  broadcastMessageEvent: vi.fn(),
  broadcastSessionEvent: vi.fn(),
  broadcastToRenderers: vi.fn(),
  getCurrentMessageRevision: vi.fn(() => 0),
  getLatestMessageSnapshot: vi.fn(() => null),
}));

const getStoredVaultMock = vi.hoisted(() => vi.fn(async () => ({ path: '/tmp/workspace' })));
const resolveChatSessionProfileKeyMock = vi.hoisted(() => vi.fn(async () => 'user-a:workspace-1'));
const setGlobalPermissionModeMock = vi.hoisted(() =>
  vi.fn(async () => ({
    changed: true,
    previousMode: 'ask',
    mode: 'full_access' as const,
  }))
);

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

vi.mock('../../services/approval/approval-gate-store.js', () => approvalStoreMock);

vi.mock('../../services/broadcast/event-bus.js', () => ({
  broadcastMessageEvent: broadcastMock.broadcastMessageEvent,
  broadcastSessionEvent: broadcastMock.broadcastSessionEvent,
  broadcastToRenderers: broadcastMock.broadcastToRenderers,
  getCurrentMessageRevision: broadcastMock.getCurrentMessageRevision,
  getLatestMessageSnapshot: broadcastMock.getLatestMessageSnapshot,
  subscribeSessionEvents: vi.fn(() => vi.fn()),
  subscribeMessageEvents: vi.fn(() => vi.fn()),
}));

vi.mock('../../services/broadcast/search-index-subscriber.js', () => ({
  subscribeChatSessionSearchIndexSync: vi.fn(),
}));

vi.mock('../../ipc/register-agent-handlers.js', () => ({
  registerChatAgentHandlers: vi.fn(),
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

vi.mock('../../../agent-runtime/desktop-adapter.js', () => ({
  createDesktopCapabilities: vi.fn(() => ({ fs: {} })),
  createDesktopCrypto: vi.fn(() => ({})),
}));

vi.mock('../../../vault.js', () => ({
  getStoredVault: getStoredVaultMock,
}));

vi.mock('../../../chat-session-store/scope.js', () => ({
  resolveChatSessionProfileKey: resolveChatSessionProfileKeyMock,
  resolveCurrentChatSessionScope: vi.fn(async () => ({
    vaultPath: '/tmp/workspace',
    profileKey: 'user-a:workspace-1',
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

vi.mock('../../../agent-runtime/mode-audit.js', () => ({
  createDesktopModeSwitchAuditWriter: vi.fn(() => ({
    append: vi.fn(async () => undefined),
  })),
}));

vi.mock('../../../agent-runtime/runtime-config.js', () => ({
  getGlobalPermissionMode: vi.fn(async () => 'ask'),
  setGlobalPermissionMode: setGlobalPermissionModeMock,
}));

describe('registerChatHandlers scope isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers.clear();
  });

  it('limits full-access auto-approve to the current workspace profile scope', async () => {
    chatSessionStoreMock.list.mockReturnValue([{ id: 'session-a' }]);

    const { registerChatHandlers } = await import('../../ipc/register.js');
    registerChatHandlers();

    const handler = registeredHandlers.get('chat:permission:setGlobalMode');
    expect(handler).toBeTypeOf('function');

    await handler?.({}, { mode: 'full_access' });

    expect(chatSessionStoreMock.list).toHaveBeenCalledWith({
      vaultPath: '/tmp/workspace',
      profileKey: 'user-a:workspace-1',
    });
    await vi.waitFor(() => {
      expect(approvalStoreMock.autoApprovePendingForSession).toHaveBeenCalledWith({
        sessionId: 'session-a',
      });
    });
  });

  it('rejects deleting a session outside the current workspace profile scope', async () => {
    chatSessionStoreMock.list.mockReturnValue([]);

    const { registerChatHandlers } = await import('../../ipc/register.js');
    registerChatHandlers();

    const handler = registeredHandlers.get('chat:sessions:delete');
    expect(handler).toBeTypeOf('function');

    await expect(handler?.({}, { sessionId: 'session-b' })).rejects.toThrow(
      'Session does not exist or is outside the current workspace.'
    );
    expect(chatSessionStoreMock.delete).not.toHaveBeenCalled();
  });
});
