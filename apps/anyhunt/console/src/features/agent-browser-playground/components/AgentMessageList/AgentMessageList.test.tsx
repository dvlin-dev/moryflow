import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChatStatus, UIMessage } from 'ai';
import { AgentMessageList } from './AgentMessageList';

vi.mock('@moryflow/ui', () => ({
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

vi.mock('./components/message-row', () => ({
  MessageRow: ({ message }: { message: UIMessage }) => <div data-testid={`row-${message.id}`} />,
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

describe('AgentMessageList assistant round collapse', () => {
  const renderList = (status: ChatStatus) =>
    render(<AgentMessageList messages={createMessages()} status={status} />);

  it('collapses process assistant messages after round finishes', () => {
    renderList('ready');

    expect(screen.getByText('Processed')).not.toBeNull();
    expect(screen.queryByTestId('row-a1')).toBeNull();
    expect(screen.getByTestId('row-a2')).not.toBeNull();
  });

  it('allows manual expand after auto collapse', () => {
    renderList('ready');

    fireEvent.click(screen.getByText('Processed'));

    expect(screen.getByTestId('row-a1')).not.toBeNull();
    expect(screen.getByTestId('row-a2')).not.toBeNull();
  });
});
