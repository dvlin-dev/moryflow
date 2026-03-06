import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';
import { ConversationSection } from './conversation-section';

const mockChatMessage = vi.fn(
  ({
    messageIndex,
    hiddenOrderedPartIndexes,
  }: {
    messageIndex: number;
    hiddenOrderedPartIndexes?: Set<number>;
  }) => (
    <div
      data-testid={`chat-message-${messageIndex}`}
      data-hidden-parts={
        hiddenOrderedPartIndexes ? Array.from(hiddenOrderedPartIndexes).join(',') : ''
      }
    />
  )
);

vi.mock('@moryflow/ui/components/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@moryflow/ui/ai/assistant-round-summary', () => ({
  AssistantRoundSummary: ({
    label,
    open,
    viewportAnchorId,
    onClick,
  }: {
    label: string;
    open: boolean;
    viewportAnchorId?: string;
    onClick: () => void;
  }) => (
    <button
      type="button"
      data-open={open ? 'true' : 'false'}
      data-anchor={viewportAnchorId}
      onClick={onClick}
    >
      {label}
    </button>
  ),
}));

vi.mock('@moryflow/ui/ai/message-list', () => ({
  MessageList: ({
    messages,
    renderMessage,
  }: {
    messages: UIMessage[];
    renderMessage: (args: { message: UIMessage; index: number }) => ReactNode;
  }) => (
    <div>
      {messages.map((message, index) => (
        <div key={message.id}>{renderMessage({ message, index })}</div>
      ))}
    </div>
  ),
}));

vi.mock('./message', () => ({
  ChatMessage: (props: { messageIndex: number; hiddenOrderedPartIndexes?: Set<number> }) =>
    mockChatMessage(props),
}));

vi.mock('./message/message-loading', () => ({
  resolveLastVisibleAssistantIndex: ({ messages }: { messages: UIMessage[] }) => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'assistant') {
        return index;
      }
    }
    return -1;
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'assistantRoundProcessedWithDuration') {
        return `processed ${params?.duration}`;
      }
      if (key === 'assistantRoundProcessed') {
        return 'processed';
      }
      return key;
    },
  }),
}));

const createMessages = (): UIMessage[] => [
  {
    id: 'u1',
    role: 'user',
    parts: [{ type: 'text', text: 'Q' }],
  },
  {
    id: 'a1',
    role: 'assistant',
    parts: [{ type: 'text', text: 'A1' }],
  },
  {
    id: 'a2',
    role: 'assistant',
    parts: [{ type: 'text', text: 'A2' }],
  },
];

describe('ConversationSection assistant round collapse', () => {
  const renderSection = (status: ChatStatus) =>
    render(<ConversationSection messages={createMessages()} status={status} threadId="thread-1" />);

  it('collapses process assistant messages after round finishes', () => {
    renderSection('ready');

    expect(screen.getByText('processed')).not.toBeNull();
    expect(screen.getByText('processed').getAttribute('data-anchor')).toBe('round:a2');
    expect(screen.queryByTestId('chat-message-1')).toBeNull();
    expect(screen.getByTestId('chat-message-2')).not.toBeNull();
  });

  it('allows manual expand after auto collapse', () => {
    renderSection('ready');

    const summary = screen.getByText('processed');
    fireEvent.click(summary);

    expect(screen.getByTestId('chat-message-1')).not.toBeNull();
    expect(screen.getByTestId('chat-message-2')).not.toBeNull();
  });

  it('anchors summary on the conclusion message when only prior ordered parts are collapsed', () => {
    const messages: UIMessage[] = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Q' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        parts: [
          { type: 'reasoning', text: 'think', state: 'done' },
          { type: 'text', text: 'Final answer' },
        ],
      },
    ];

    render(<ConversationSection messages={messages} status="ready" threadId="thread-1" />);

    expect(screen.getByText('processed')).not.toBeNull();
    expect(screen.getByText('processed').getAttribute('data-anchor')).toBe('round:a1');
    expect(screen.getByTestId('chat-message-1').getAttribute('data-hidden-parts')).toBe('0');
  });

  it('falls back to processed label when persisted round duration is 0ms', () => {
    const fixedTime = Date.parse('2026-03-06T10:00:00.000Z');
    const messages: UIMessage[] = [
      {
        id: 'u1',
        role: 'user',
        parts: [{ type: 'text', text: 'Q' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A1' }],
      },
      {
        id: 'a2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'A2' }],
        metadata: {
          chat: {
            assistantRound: {
              version: 1,
              roundId: 'a2',
              startedAt: fixedTime,
              finishedAt: fixedTime,
              durationMs: 0,
              processCount: 1,
            },
          },
        },
      },
    ];

    render(<ConversationSection messages={messages} status="ready" threadId="thread-1" />);

    expect(screen.getByText('processed')).not.toBeNull();
    expect(screen.queryByText('processed 0s')).toBeNull();
  });
});
