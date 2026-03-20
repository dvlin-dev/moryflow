/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSummaryMock = vi.hoisted(() =>
  vi.fn(() => ({
    vaultPath: 'relative/workspace',
    preferredModelId: 'model-default',
  }))
);

const processAttachmentsMock = vi.hoisted(() =>
  vi.fn(async () => ({
    textContexts: [],
    images: [],
  }))
);

vi.mock('../../../chat-session-store/index.js', () => ({
  chatSessionStore: {
    getSummary: getSummaryMock,
  },
}));

vi.mock('../../../agent-runtime/runtime-config.js', () => ({
  getGlobalPermissionMode: vi.fn(async () => 'ask'),
}));

vi.mock('../../services/attachments/processAttachments.js', () => ({
  processAttachments: processAttachmentsMock,
}));

describe('resolveChatRequestInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid workspace scope before processing attachments', async () => {
    const { resolveChatRequestInput } =
      await import('../../application/resolveChatRequestInput.js');

    await expect(
      resolveChatRequestInput({
        chatId: 'chat-1',
        channel: 'chat:channel:1',
        messages: [
          {
            id: 'user-1',
            role: 'user',
            parts: [
              { type: 'text', text: 'hello' },
              {
                type: 'file',
                filename: 'note.txt',
                mediaType: 'text/plain',
                url: 'data:text/plain;base64,aGVsbG8=',
              },
            ],
          } as never,
        ],
      })
    ).rejects.toThrow('This thread has invalid workspace scope. Please create a new thread.');

    expect(processAttachmentsMock).not.toHaveBeenCalled();
  });
});
