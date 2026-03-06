import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { ConversationSection } from './conversation-section';

const mockStoreState: {
  messages: UIMessage[];
  status: 'ready' | 'submitted' | 'streaming' | 'error';
} = {
  messages: [],
  status: 'ready',
};

vi.mock('../store', () => ({
  useChatSessionStore: (selector: (state: typeof mockStoreState) => unknown) =>
    selector(mockStoreState),
}));

vi.mock('./message', () => ({
  Message: ({ message }: { message: UIMessage }) => <div data-testid={`message-${message.id}`} />,
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

vi.mock('lucide-react', () => ({
  MessageSquare: () => <div />,
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
  {
    id: 'a3',
    role: 'assistant',
    parts: [{ type: 'text', text: 'A3' }],
  },
];

describe('ConversationSection assistant round collapse', () => {
  it('collapses process assistant messages after round finishes', () => {
    mockStoreState.messages = createMessages();
    mockStoreState.status = 'ready';
    const { container } = render(<ConversationSection />);

    expect(screen.getByText('processed')).not.toBeNull();
    expect(screen.queryByTestId('message-a1')).toBeNull();
    expect(screen.queryByTestId('message-a2')).toBeNull();
    expect(screen.getByTestId('message-a3')).not.toBeNull();
    const list = container.querySelector('.flex.flex-col.gap-3');
    expect(list?.childElementCount).toBe(3);
  });

  it('allows manual expand after auto collapse', () => {
    mockStoreState.messages = createMessages();
    mockStoreState.status = 'ready';
    render(<ConversationSection />);

    fireEvent.click(screen.getByText('processed'));

    expect(screen.getByTestId('message-a1')).not.toBeNull();
    expect(screen.getByTestId('message-a2')).not.toBeNull();
    expect(screen.getByTestId('message-a3')).not.toBeNull();
  });
});
