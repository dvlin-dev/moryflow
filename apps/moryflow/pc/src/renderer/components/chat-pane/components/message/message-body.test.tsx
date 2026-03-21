import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { ToolUIPart, UIMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageBody } from './message-body';
import type { MessageBodyModel } from './message-body-model';

const { mockReasoningTrigger, mockToolPart } = vi.hoisted(() => ({
  mockReasoningTrigger: vi.fn(),
  mockToolPart: vi.fn(),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@moryflow/ui/ai/message/base', () => ({
  MessageContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@moryflow/ui/ai/loader', () => ({
  Loader: () => <div />,
}));

vi.mock('./message-rich-part', () => ({
  MessageRichPart: (props: {
    messageId: string;
    orderedPartIndex: number;
    part: { type: string; text?: string };
  }) => {
    if (props.part.type === 'reasoning') {
      mockReasoningTrigger({
        viewportAnchorId: `reasoning:${props.messageId}:${props.orderedPartIndex}`,
      });
      return <button type="button">reasoning</button>;
    }

    return <div>{props.part.text ?? ''}</div>;
  },
}));

vi.mock('./tool-part', () => ({
  ToolPart: (props: unknown) => {
    mockToolPart(props);
    return <div>tool</div>;
  },
}));

const createModel = (): MessageBodyModel => ({
  view: {
    message: {
      id: 'assistant-1',
      role: 'assistant',
      parts: [],
    } as unknown as UIMessage,
    visibleOrderedPartEntries: [
      {
        orderedPart: { type: 'reasoning', text: 'think', state: 'done' },
        orderedPartIndex: 1,
      },
      {
        orderedPart: { type: 'text', text: 'final answer' },
        orderedPartIndex: 2,
      },
      {
        orderedPart: {
          type: 'tool-search',
          toolCallId: 'tool-1',
          state: 'output-available',
          input: {},
          output: { ok: true },
        } as UIMessage['parts'][number],
        orderedPartIndex: 3,
      },
    ],
    showThinkingPlaceholder: false,
    showStreamingTail: false,
    cleanMessageText: 'final answer',
    isUser: false,
    streamdownAnimated: false,
    streamdownIsAnimating: false,
    lastTextOrderedPartIndex: -1,
    thinkingText: 'Thinking',
  },
  edit: {
    isEditing: false,
    editContent: '',
    textareaRef: { current: null },
    contentRef: { current: null },
    editContentStyle: undefined,
    onEditContentChange: () => undefined,
    onEditKeyDown: () => undefined,
  },
  tool: {
    statusLabels: {},
    summaryLabels: {
      running: () => 'running',
      success: () => 'success',
      interrupted: () => 'interrupted',
      error: () => 'error',
      skipped: () => 'skipped',
    },
    outputLabels: {
      result: 'result',
      error: 'error',
      targetFile: 'target',
      contentTooLong: 'too long',
      outputTruncated: 'truncated',
      fullOutputPath: 'path',
      applyToFile: 'apply',
      applied: 'applied',
      applying: 'applying',
      noTasks: 'no tasks',
      tasksCompleted: () => 'done',
    },
    uiLabels: {
      approvalRequired: 'approval',
      approvalRequestHint: 'hint',
      approvalGranted: 'granted',
      approvalAlreadyHandled: 'handled',
      approveOnce: 'once',
      approveAlways: 'always',
      denyOnce: 'deny',
      approvalHowToApplyTitle: 'how to apply',
      approvalAlwaysAllowHint: 'always allow',
    },
    canApplyDiff: false,
    onApplyDiff: async () => undefined,
    onApplyDiffSuccess: () => undefined,
    onApplyDiffError: () => undefined,
  },
});

describe('MessageBody viewport anchors', () => {
  beforeEach(() => {
    mockReasoningTrigger.mockClear();
    mockToolPart.mockClear();
  });

  it('passes stable viewportAnchorId to reasoning and tool triggers', async () => {
    render(<MessageBody model={createModel()} />);

    await waitFor(() => {
      expect(mockReasoningTrigger).toHaveBeenCalledTimes(1);
    });
    expect(mockReasoningTrigger.mock.lastCall?.[0]).toMatchObject({
      viewportAnchorId: 'reasoning:assistant-1:1',
    });

    expect(mockToolPart).toHaveBeenCalledTimes(1);
    expect(mockToolPart.mock.lastCall?.[0]).toMatchObject({
      messageId: 'assistant-1',
      index: 3,
      part: expect.objectContaining({
        type: 'tool-search',
      }) as ToolUIPart,
    });
  });
});
