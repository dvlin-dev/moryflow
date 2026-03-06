import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatMessage } from './index';

type SplitMessagePartsMockResult = {
  fileParts: unknown[];
  orderedParts: UIMessage['parts'];
  messageText: string;
};

const { mockSplitMessageParts, mockFindLastTextPartIndex, mockMessageBody } = vi.hoisted(() => ({
  mockSplitMessageParts: vi.fn<() => SplitMessagePartsMockResult>(() => ({
    fileParts: [],
    orderedParts: [],
    messageText: 'hello',
  })),
  mockFindLastTextPartIndex: vi.fn(() => -1),
  mockMessageBody: vi.fn((_props: unknown) => <div data-testid="message-body" />),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@moryflow/ui/ai/message', () => ({
  Message: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageAttachment: ({ data }: { data: { name: string } }) => <div>{data.name}</div>,
  MessageAttachments: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageMetaAttachments: ({ attachments }: { attachments: Array<{ name: string }> }) => (
    <div data-testid="meta-attachments">{attachments.map((item) => item.name).join(',')}</div>
  ),
  cleanFileRefMarker: (text: string) => text,
  findLastTextPartIndex: mockFindLastTextPartIndex,
  splitMessageParts: mockSplitMessageParts,
}));

vi.mock('./message-body', () => ({
  MessageBody: (props: unknown) => mockMessageBody(props),
}));

vi.mock('./message-actions', () => ({
  MessageActionsLayer: () => null,
}));

vi.mock('./use-message-edit', () => ({
  useMessageEdit: () => ({
    isEditing: false,
    editContent: '',
    editSize: null,
    textareaRef: { current: null },
    contentRef: { current: null },
    setEditContent: () => undefined,
    startEdit: () => undefined,
    cancelEdit: () => undefined,
    confirmEdit: () => undefined,
    handleKeyDown: () => undefined,
  }),
}));

vi.mock('./use-message-tool-model', () => ({
  useMessageToolModel: () => ({
    statusLabels: {},
    summaryLabels: {
      running: () => 'running',
      success: () => 'success',
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
      approvalAlreadyHandled: 'already handled',
      approveOnce: 'once',
      approveAlways: 'always',
      denyOnce: 'deny',
      approvalHowToApplyTitle: 'how to apply',
      approvalAlwaysAllowHint: 'always allow hint',
    },
    canApplyDiff: false,
    onApplyDiff: async () => undefined,
    onApplyDiffSuccess: () => undefined,
    onApplyDiffError: () => undefined,
  }),
}));

vi.mock('./message-loading', () => ({
  shouldRenderAssistantMessage: () => true,
  shouldShowAssistantLoadingPlaceholder: () => false,
}));

beforeEach(() => {
  mockSplitMessageParts.mockReset();
  mockSplitMessageParts.mockReturnValue({
    fileParts: [],
    orderedParts: [],
    messageText: 'hello',
  });
  mockFindLastTextPartIndex.mockReset();
  mockFindLastTextPartIndex.mockReturnValue(-1);
  mockMessageBody.mockClear();
});

describe('ChatMessage user meta chips', () => {
  it('renders both file and selection reference chips for user message metadata', () => {
    const message = {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
      metadata: {
        chat: {
          attachments: [
            {
              id: 'file-1',
              type: 'file-ref',
              path: 'docs/a.md',
              name: 'a.md',
              extension: 'md',
            },
          ],
          selectionReference: {
            preview: 'selected paragraph',
            filePath: '/vault/docs/a.md',
            charCount: 17,
            isTruncated: false,
          },
        },
      },
    } as unknown as UIMessage;

    render(
      <ChatMessage
        message={message}
        messageIndex={0}
        status="ready"
        isLastAssistant={false}
        isLastMessage
      />
    );

    expect(screen.getByText('a.md')).toBeTruthy();
    expect(screen.getByText('selected paragraph')).toBeTruthy();
  });

  it('passes only visible orderedParts to MessageBody when hiddenOrderedPartIndexes is provided', () => {
    mockSplitMessageParts.mockReturnValue({
      fileParts: [],
      orderedParts: [
        { type: 'reasoning', text: 'think', state: 'done' },
        { type: 'text', text: 'Final answer' },
      ] as UIMessage['parts'],
      messageText: 'Final answer',
    });

    render(
      <ChatMessage
        message={
          {
            id: 'msg-2',
            role: 'assistant',
            parts: [],
          } as unknown as UIMessage
        }
        messageIndex={1}
        status="ready"
        isLastAssistant
        isLastMessage
        hiddenOrderedPartIndexes={new Set([0])}
      />
    );

    expect(mockFindLastTextPartIndex).toHaveBeenCalledWith([
      { type: 'text', text: 'Final answer' },
    ]);
    expect(mockMessageBody).toHaveBeenCalledTimes(1);
    const model = mockMessageBody.mock.lastCall?.[0] as
      | { model?: { view?: { orderedParts?: unknown[] } } }
      | undefined;
    expect(model?.model?.view?.orderedParts).toEqual([{ type: 'text', text: 'Final answer' }]);
  });
});
