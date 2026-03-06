import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Message } from './message';

const { mockReasoningTrigger, mockMessageTool } = vi.hoisted(() => ({
  mockReasoningTrigger: vi.fn(),
  mockMessageTool: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@moryflow/agents-runtime/ui-message/assistant-placeholder-policy', () => ({
  shouldRenderAssistantMessage: () => true,
  shouldShowAssistantLoadingPlaceholder: () => false,
}));

vi.mock('@moryflow/ui/ai/message', () => ({
  Message: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageResponse: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  cleanFileRefMarker: (text: string) => text,
  splitMessageParts: (parts: unknown[]) => ({
    orderedParts: parts,
    messageText: '',
  }),
}));

vi.mock('@moryflow/ui/ai/loader', () => ({
  Loader: () => <div />,
}));

vi.mock('@moryflow/ui/ai/reasoning', () => ({
  Reasoning: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ReasoningTrigger: (props: unknown) => {
    mockReasoningTrigger(props);
    return <button type="button">reasoning</button>;
  },
  ReasoningContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./message-tool', () => ({
  MessageTool: (props: unknown) => {
    mockMessageTool(props);
    return <div>tool</div>;
  },
}));

describe('Admin Message viewport anchors', () => {
  beforeEach(() => {
    mockReasoningTrigger.mockClear();
    mockMessageTool.mockClear();
  });

  it('passes stable viewportAnchorId to reasoning and tool triggers', () => {
    render(
      <Message
        message={{
          id: 'assistant-1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'think', state: 'done' },
            { type: 'tool-search', state: 'output-available', output: { ok: true } },
            { type: 'text', text: 'final answer' },
          ],
        }}
        status="ready"
        isLastMessage
      />
    );

    expect(mockReasoningTrigger.mock.lastCall?.[0]).toMatchObject({
      viewportAnchorId: 'reasoning:assistant-1:0',
    });
    expect(mockMessageTool.mock.lastCall?.[0]).toMatchObject({
      messageId: 'assistant-1',
      partIndex: 1,
    });
  });
});
