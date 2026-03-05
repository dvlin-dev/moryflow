import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { ChatStatus, UIMessage } from 'ai';
import { ConversationSection } from './conversation-section';

vi.mock('@moryflow/ui/components/alert', () => ({
  Alert: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@moryflow/ui/ai/assistant-round-summary', () => ({
  AssistantRoundSummary: ({
    label,
    open,
    onClick,
  }: {
    label: string;
    open: boolean;
    onClick: () => void;
  }) => (
    <button type="button" data-open={open ? 'true' : 'false'} onClick={onClick}>
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
  ChatMessage: ({ messageIndex }: { messageIndex: number }) => (
    <div data-testid={`chat-message-${messageIndex}`} />
  ),
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
});
