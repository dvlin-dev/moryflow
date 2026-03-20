/* @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mkdirMock = vi.hoisted(() => vi.fn(async () => undefined));
const writeFileMock = vi.hoisted(() => vi.fn(async () => undefined));
const getStoredVaultMock = vi.hoisted(() => vi.fn(async () => ({ path: '/vault/root' })));

vi.mock('node:fs/promises', () => ({
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

vi.mock('../../../../vault.js', () => ({
  getStoredVault: getStoredVaultMock,
}));

describe('processAttachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps images as image inputs and persists oversized text attachments for later tool access', async () => {
    const { ATTACHMENT_MAX_CHARS, processAttachments } =
      await import('../../../services/attachments/processAttachments.js');

    const largeText = 'A'.repeat(ATTACHMENT_MAX_CHARS + 10);
    const oversizedDataUrl = `data:text/plain;base64,${Buffer.from(largeText, 'utf8').toString('base64')}`;

    const result = await processAttachments([
      {
        type: 'file',
        mediaType: 'image/png',
        filename: 'diagram.png',
        url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==',
      } as never,
      {
        type: 'file',
        mediaType: 'text/plain',
        filename: 'notes.txt',
        url: oversizedDataUrl,
      } as never,
    ]);

    expect(result.images).toEqual([
      {
        url: 'data:image/png;base64,ZmFrZS1pbWFnZQ==',
        mediaType: 'image/png',
        filename: 'diagram.png',
      },
    ]);
    expect(result.textContexts).toHaveLength(1);
    expect(result.textContexts[0]).toEqual(
      expect.objectContaining({
        filename: 'notes.txt',
        mediaType: 'text/plain',
        truncated: true,
        filePath: expect.stringContaining('.moryflow/attachments/'),
      })
    );
    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalledTimes(2);
  });
});
