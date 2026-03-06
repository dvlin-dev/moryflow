import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import { ChatMessage } from './index';

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
  findLastTextPartIndex: () => -1,
  splitMessageParts: () => ({
    fileParts: [],
    orderedParts: [],
    messageText: 'hello',
  }),
}));

vi.mock('./message-body', () => ({
  MessageBody: () => <div data-testid="message-body" />,
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
    outputLabels: {
      result: 'result',
      error: 'error',
      targetFile: 'target',
      contentTooLong: 'too long',
      outputTruncated: 'truncated',
      viewFullOutput: 'view full',
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
    onOpenFullOutput: async () => undefined,
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
});
