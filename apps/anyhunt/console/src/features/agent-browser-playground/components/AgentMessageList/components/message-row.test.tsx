import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageRow } from './message-row';

const { mockReasoningTrigger, mockMessageTool } = vi.hoisted(() => ({
  mockReasoningTrigger: vi.fn(),
  mockMessageTool: vi.fn(),
}));

vi.mock('@moryflow/ui/ai/message', () => ({
  Message: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageAttachment: () => <div />,
  MessageAttachments: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageMetaAttachments: () => null,
  MessageResponse: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  buildVisibleOrderedPartEntries: (
    parts: UIMessage['parts'],
    hiddenOrderedPartIndexes?: ReadonlySet<number>
  ) =>
    parts.flatMap((orderedPart, orderedPartIndex) =>
      hiddenOrderedPartIndexes?.has(orderedPartIndex) ? [] : [{ orderedPart, orderedPartIndex }]
    ),
  cleanFileRefMarker: (text: string) => text,
  findLastTextOrderedPartIndex: (
    entries: Array<{ orderedPart: UIMessage['parts'][number]; orderedPartIndex: number }>
  ) => {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (entry?.orderedPart?.type === 'text') {
        return entry.orderedPartIndex;
      }
    }
    return -1;
  },
  findLastTextPartIndex: () => -1,
  splitMessageParts: (parts: UIMessage['parts']) => ({
    fileParts: [],
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

vi.mock('@moryflow/ui/ai/streamdown-anim', () => ({
  STREAMDOWN_ANIM_STREAMING_OPTIONS: {},
}));

vi.mock('@moryflow/agents-runtime/ui-message/assistant-placeholder-policy', () => ({
  shouldRenderAssistantMessage: () => true,
  shouldShowAssistantLoadingPlaceholder: () => false,
}));

vi.mock('./message-tool', () => ({
  MessageTool: (props: unknown) => {
    mockMessageTool(props);
    return <div>tool</div>;
  },
}));

describe('MessageRow viewport anchors', () => {
  beforeEach(() => {
    mockReasoningTrigger.mockClear();
    mockMessageTool.mockClear();
  });

  it('passes stable viewportAnchorId to reasoning and tool triggers', () => {
    render(
      <MessageRow
        message={
          {
            id: 'assistant-1',
            role: 'assistant',
            parts: [
              { type: 'reasoning', text: 'think', state: 'done' },
              { type: 'tool-search', state: 'output-available', output: { ok: true } },
              { type: 'text', text: 'final answer' },
            ],
          } as unknown as UIMessage
        }
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

  it('keeps original ordered part indexes when earlier parts are hidden', () => {
    render(
      <MessageRow
        message={
          {
            id: 'assistant-1',
            role: 'assistant',
            parts: [
              { type: 'text', text: 'intro' },
              { type: 'reasoning', text: 'think', state: 'done' },
              { type: 'tool-search', state: 'output-available', output: { ok: true } },
              { type: 'text', text: 'final answer' },
            ],
          } as unknown as UIMessage
        }
        status="ready"
        isLastMessage
        hiddenOrderedPartIndexes={new Set([0])}
      />
    );

    expect(mockReasoningTrigger.mock.lastCall?.[0]).toMatchObject({
      viewportAnchorId: 'reasoning:assistant-1:1',
    });
    expect(mockMessageTool.mock.lastCall?.[0]).toMatchObject({
      messageId: 'assistant-1',
      partIndex: 2,
    });
  });
});
