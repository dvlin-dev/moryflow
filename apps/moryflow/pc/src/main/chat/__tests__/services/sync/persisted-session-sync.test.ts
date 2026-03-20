/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatSessionStoreMock = vi.hoisted(() => ({
  getHistory: vi.fn(),
  getUiMessages: vi.fn(),
  updateSessionMeta: vi.fn((conversationId: string, payload: { uiMessages: unknown[] }) => ({
    id: conversationId,
    uiMessages: payload.uiMessages,
  })),
}));

const agentHistoryToUiMessagesMock = vi.hoisted(() => vi.fn());
const sanitizePersistedUiMessagesMock = vi.hoisted(() => vi.fn((messages) => messages));
const broadcastSessionEventMock = vi.hoisted(() => vi.fn());
const broadcastMessageEventMock = vi.hoisted(() => vi.fn());

vi.mock('../../../../chat-session-store/index.js', () => ({
  chatSessionStore: chatSessionStoreMock,
}));

vi.mock('../../../../chat-session-store/ui-message.js', () => ({
  agentHistoryToUiMessages: agentHistoryToUiMessagesMock,
}));

vi.mock('../../../messages/sanitizePersistedUiMessages.js', () => ({
  sanitizePersistedUiMessages: sanitizePersistedUiMessagesMock,
}));

vi.mock('../../../services/broadcast/event-bus.js', () => ({
  broadcastSessionEvent: broadcastSessionEventMock,
  broadcastMessageEvent: broadcastMessageEventMock,
}));

describe('syncPersistedConversationUiState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves non-text rich parts when rebuilt text content matches existing messages', async () => {
    const rebuiltMessages = [
      {
        id: 'rebuilt-assistant',
        role: 'assistant',
        parts: [{ type: 'text', text: 'same text' }],
      },
    ];
    const existingMessages = [
      {
        id: 'existing-assistant',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'same text' },
          { type: 'tool-output-available', toolCallId: 'tool-1', output: 'done' },
        ],
      },
    ];

    chatSessionStoreMock.getHistory.mockReturnValue([{ id: 'history' }]);
    chatSessionStoreMock.getUiMessages.mockReturnValue(existingMessages);
    agentHistoryToUiMessagesMock.mockReturnValue(rebuiltMessages);

    const { syncPersistedConversationUiState } =
      await import('../../../services/sync/persisted-session-sync.js');

    await syncPersistedConversationUiState('conversation-1');

    expect(chatSessionStoreMock.updateSessionMeta).toHaveBeenCalledWith('conversation-1', {
      uiMessages: [
        {
          id: 'existing-assistant',
          role: 'assistant',
          parts: [
            { type: 'text', text: 'same text' },
            { type: 'tool-output-available', toolCallId: 'tool-1', output: 'done' },
          ],
        },
      ],
    });
    expect(broadcastSessionEventMock).toHaveBeenCalledWith({
      type: 'updated',
      session: expect.objectContaining({ id: 'conversation-1' }),
    });
    expect(broadcastMessageEventMock).toHaveBeenCalledWith({
      type: 'snapshot',
      sessionId: 'conversation-1',
      messages: [
        {
          id: 'existing-assistant',
          role: 'assistant',
          parts: [
            { type: 'text', text: 'same text' },
            { type: 'tool-output-available', toolCallId: 'tool-1', output: 'done' },
          ],
        },
      ],
      persisted: true,
    });
  });
});
