/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatSessionStoreMock = vi.hoisted(() => ({
  getUiMessages: vi.fn(),
}));

const broadcastMock = vi.hoisted(() => ({
  getLatestMessageSnapshot: vi.fn(),
  getCurrentMessageRevision: vi.fn(),
}));

vi.mock('../../../chat-session-store/index.js', () => ({
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

vi.mock('../../../agent-runtime/desktop-adapter.js', () => ({
  createDesktopCapabilities: vi.fn(() => ({ fs: {} })),
  createDesktopCrypto: vi.fn(() => ({})),
}));

vi.mock('../../../vault.js', () => ({
  getStoredVault: vi.fn(async () => ({ path: '/tmp/vault' })),
}));

vi.mock('../../services/broadcast/event-bus.js', () => ({
  getLatestMessageSnapshot: broadcastMock.getLatestMessageSnapshot,
  getCurrentMessageRevision: broadcastMock.getCurrentMessageRevision,
  broadcastMessageEvent: vi.fn(),
  broadcastSessionEvent: vi.fn(),
  subscribeSessionEvents: vi.fn(() => vi.fn()),
  subscribeMessageEvents: vi.fn(() => vi.fn()),
}));

describe('resolveSessionMessagesSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('存在最新广播快照时应优先返回广播快照，保持 revision 对齐', async () => {
    const { resolveSessionMessagesSnapshot } =
      await import('../../application/resolveSessionMessagesSnapshot.js');
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
    const { resolveSessionMessagesSnapshot } =
      await import('../../application/resolveSessionMessagesSnapshot.js');
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
