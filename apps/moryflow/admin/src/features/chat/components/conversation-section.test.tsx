import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { ConversationSection } from './conversation-section';

const mockMessage = vi.fn(
  ({
    message,
    hiddenOrderedPartIndexes,
  }: {
    message: UIMessage;
    hiddenOrderedPartIndexes?: Set<number>;
  }) => (
    <div
      data-testid={`message-${message.id}`}
      data-hidden-parts={
        hiddenOrderedPartIndexes ? Array.from(hiddenOrderedPartIndexes).join(',') : ''
      }
    />
  )
);

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
  Message: (props: { message: UIMessage; hiddenOrderedPartIndexes?: Set<number> }) =>
    mockMessage(props),
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
    expect(screen.getByText('processed').getAttribute('data-anchor')).toBe('round:a3');
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

  it('anchors summary on the conclusion message when only prior ordered parts are collapsed', () => {
    mockStoreState.messages = [
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
    mockStoreState.status = 'ready';
    render(<ConversationSection />);

    expect(screen.getByText('processed')).not.toBeNull();
    expect(screen.getByText('processed').getAttribute('data-anchor')).toBe('round:a1');
    expect(screen.getByTestId('message-a1').getAttribute('data-hidden-parts')).toBe('0');
  });
});
