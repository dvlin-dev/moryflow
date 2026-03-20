/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const activeStreamsMock = vi.hoisted(() => ({ entries: new Map() }));
const registerChatAgentHandlersMock = vi.hoisted(() => vi.fn());
const registerChatSessionHandlersMock = vi.hoisted(() => vi.fn());
const registerChatPermissionHandlersMock = vi.hoisted(() => vi.fn());
const registerChatApprovalHandlersMock = vi.hoisted(() => vi.fn());
const registerChatEditHandlersMock = vi.hoisted(() => vi.fn());
const subscribeChatSessionSearchIndexSyncMock = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('../../services/active-stream-registry.js', () => ({
  createActiveStreamRegistry: vi.fn(() => activeStreamsMock),
}));

vi.mock('../../ipc/register-agent-handlers.js', () => ({
  registerChatAgentHandlers: registerChatAgentHandlersMock,
}));

vi.mock('../../ipc/register-session-handlers.js', () => ({
  registerChatSessionHandlers: registerChatSessionHandlersMock,
}));

vi.mock('../../ipc/register-permission-handlers.js', () => ({
  registerChatPermissionHandlers: registerChatPermissionHandlersMock,
}));

vi.mock('../../ipc/register-approval-handlers.js', () => ({
  registerChatApprovalHandlers: registerChatApprovalHandlersMock,
}));

vi.mock('../../ipc/register-edit-handlers.js', () => ({
  registerChatEditHandlers: registerChatEditHandlersMock,
}));

vi.mock('../../../chat-session-store/index.js', () => ({
  chatSessionStore: {
    getUiMessages: vi.fn(() => []),
  },
}));

vi.mock('../../../chat-session-store/scope.js', () => ({
  resolveChatSessionProfileKey: vi.fn(async () => 'profile-key'),
}));

vi.mock('../../../chat-session-store/ui-message.js', () => ({
  agentHistoryToUiMessages: vi.fn(() => []),
}));

vi.mock('../../../vault/index.js', () => ({
  getStoredVault: vi.fn(async () => ({ path: '/tmp/vault' })),
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

vi.mock('../../application/session-visibility.js', () => ({
  assertSessionVisibleInCurrentScope: vi.fn(async () => undefined),
  listVisibleSessions: vi.fn(async () => []),
}));

vi.mock('../../application/resolveSessionMessagesSnapshot.js', () => ({
  resolveSessionMessagesSnapshot: vi.fn(() => ({ sessionId: 'x', messages: [], revision: 0 })),
}));

vi.mock('../../services/approval/approval-gate-store.js', () => ({
  approveToolRequest: vi.fn(async () => ({ ok: true })),
  autoApprovePendingForSession: vi.fn(async () => undefined),
  consumeFullAccessUpgradePromptReminder: vi.fn(() => ({ consumed: false })),
  getApprovalContext: vi.fn(() => ({ suggestFullAccessUpgrade: false })),
}));

vi.mock('../../services/broadcast/event-bus.js', () => ({
  broadcastMessageEvent: vi.fn(),
  broadcastSessionEvent: vi.fn(),
  broadcastToRenderers: vi.fn(),
}));

vi.mock('../../services/broadcast/search-index-subscriber.js', () => ({
  subscribeChatSessionSearchIndexSync: subscribeChatSessionSearchIndexSyncMock,
}));

vi.mock('../../services/runtime.js', () => ({
  getRuntime: vi.fn(() => ({
    generateTitle: vi.fn(async () => 'title'),
    prepareCompaction: vi.fn(async () => ({ historyChanged: false })),
  })),
}));

describe('registerChatHandlers composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates registration to dedicated handler modules with shared dependencies', async () => {
    const { registerChatHandlers } = await import('../../ipc/register.js');

    registerChatHandlers();

    expect(subscribeChatSessionSearchIndexSyncMock).toHaveBeenCalledTimes(1);
    expect(registerChatAgentHandlersMock).toHaveBeenCalledTimes(1);
    expect(registerChatSessionHandlersMock).toHaveBeenCalledTimes(1);
    expect(registerChatPermissionHandlersMock).toHaveBeenCalledTimes(1);
    expect(registerChatApprovalHandlersMock).toHaveBeenCalledTimes(1);
    expect(registerChatEditHandlersMock).toHaveBeenCalledTimes(1);

    for (const registerMock of [
      registerChatAgentHandlersMock,
      registerChatSessionHandlersMock,
      registerChatPermissionHandlersMock,
      registerChatApprovalHandlersMock,
      registerChatEditHandlersMock,
    ]) {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          activeStreams: activeStreamsMock,
        })
      );
    }
  });
});
