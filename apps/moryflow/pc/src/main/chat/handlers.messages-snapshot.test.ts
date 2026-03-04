/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatSessionStoreMock = vi.hoisted(() => ({
  getUiMessages: vi.fn(),
}));

const broadcastMock = vi.hoisted(() => ({
  getLatestMessageSnapshot: vi.fn(),
  getCurrentMessageRevision: vi.fn(),
}));

vi.mock('../chat-session-store/index.js', () => ({
  chatSessionStore: chatSessionStoreMock,
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
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

vi.mock('../agent-runtime/desktop-adapter.js', () => ({
  createDesktopCapabilities: vi.fn(() => ({ fs: {} })),
  createDesktopCrypto: vi.fn(() => ({})),
}));

vi.mock('../vault.js', () => ({
  getStoredVault: vi.fn(async () => ({ path: '/tmp/vault' })),
}));

vi.mock('./broadcast.js', () => ({
  getLatestMessageSnapshot: broadcastMock.getLatestMessageSnapshot,
  getCurrentMessageRevision: broadcastMock.getCurrentMessageRevision,
  broadcastMessageEvent: vi.fn(),
  broadcastSessionEvent: vi.fn(),
}));

vi.mock('./chat-request.js', () => ({
  createChatRequestHandler: vi.fn(() => vi.fn()),
}));

vi.mock('./approval-store.js', () => ({
  approveToolRequest: vi.fn(async () => ({ ok: true })),
  autoApprovePendingForSession: vi.fn(async () => undefined),
  clearApprovalGate: vi.fn(() => undefined),
  consumeFullAccessUpgradePromptReminder: vi.fn(() => ({ shouldPrompt: false })),
  getApprovalContext: vi.fn(() => null),
}));

vi.mock('./runtime.js', () => ({
  getRuntime: vi.fn(() => ({
    generateTitle: vi.fn(async () => 'title'),
    prepareCompaction: vi.fn(async () => ({ historyChanged: false })),
  })),
}));

vi.mock('../agent-runtime/index.js', () => ({
  createChatSession: vi.fn(() => ({})),
}));

vi.mock('../agent-runtime/mode-audit.js', () => ({
  createDesktopModeSwitchAuditWriter: vi.fn(() => vi.fn(async () => undefined)),
}));

vi.mock('../agent-runtime/runtime-config.js', () => ({
  getRuntimeConfig: vi.fn(async () => ({ mode: { default: 'ask' } })),
}));

vi.mock('./session-mode-updater.js', () => ({
  updateSessionModeAndScheduleAutoApprove: vi.fn(async () => ({ ok: true })),
}));

describe('resolveSessionMessagesSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('存在最新广播快照时应优先返回广播快照，保持 revision 对齐', async () => {
    const { resolveSessionMessagesSnapshot } = await import('./handlers.js');
    const previewMessages = [{ id: 'preview', role: 'assistant', parts: [] }] as any[];
    broadcastMock.getLatestMessageSnapshot.mockReturnValue({
      revision: 12,
      messages: previewMessages,
      persisted: false,
    });

    const result = resolveSessionMessagesSnapshot('session_1');

    expect(result).toEqual({
      sessionId: 'session_1',
      messages: previewMessages,
      revision: 12,
    });
    expect(chatSessionStoreMock.getUiMessages).not.toHaveBeenCalled();
  });

  it('无广播快照时应回退会话存储消息与当前 revision', async () => {
    const { resolveSessionMessagesSnapshot } = await import('./handlers.js');
    const persistedMessages = [{ id: 'persisted', role: 'assistant', parts: [] }] as any[];
    broadcastMock.getLatestMessageSnapshot.mockReturnValue(null);
    broadcastMock.getCurrentMessageRevision.mockReturnValue(3);
    chatSessionStoreMock.getUiMessages.mockReturnValue(persistedMessages);

    const result = resolveSessionMessagesSnapshot('session_2');

    expect(result).toEqual({
      sessionId: 'session_2',
      messages: persistedMessages,
      revision: 3,
    });
  });
});
