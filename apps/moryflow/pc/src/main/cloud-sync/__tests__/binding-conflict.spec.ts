/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readBindingMock, deleteBindingMock, fetchCurrentUserIdMock, sendMock } = vi.hoisted(() => ({
  readBindingMock: vi.fn(),
  deleteBindingMock: vi.fn(),
  fetchCurrentUserIdMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock('electron', () => ({
  BrowserWindow: {
    getFocusedWindow: vi.fn(() => null),
    getAllWindows: vi.fn(() => [
      {
        webContents: {
          send: sendMock,
        },
      },
    ]),
  },
}));

vi.mock('../store.js', () => ({
  readBinding: readBindingMock,
  deleteBinding: deleteBindingMock,
}));

vi.mock('../user-info.js', () => ({
  fetchCurrentUserId: fetchCurrentUserIdMock,
  clearUserIdCache: vi.fn(),
}));

vi.mock('../logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import {
  checkAndResolveBindingConflict,
  handleBindingConflictResponse,
} from '../binding-conflict.js';

describe('checkAndResolveBindingConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBindingMock.mockReturnValue({
      localPath: '/vault',
      vaultId: 'vault-old',
      vaultName: 'workspace',
      boundAt: Date.now(),
      userId: 'user-old',
    });
    fetchCurrentUserIdMock.mockResolvedValue('user-new');
  });

  it('returns previous binding and deletes old binding before rebinding to the current account', async () => {
    sendMock.mockImplementation((_channel: string, request: { requestId: string }) => {
      handleBindingConflictResponse(request.requestId, 'sync_to_current');
    });

    const result = await checkAndResolveBindingConflict('/vault');

    expect(result).toEqual({
      hasConflict: true,
      choice: 'sync_to_current',
      previousBinding: expect.objectContaining({
        vaultId: 'vault-old',
        userId: 'user-old',
      }),
    });
    expect(deleteBindingMock).toHaveBeenCalledWith('/vault');
  });

  it('stays offline when deleting the old binding fails', async () => {
    deleteBindingMock.mockImplementation(() => {
      throw new Error('write failed');
    });
    sendMock.mockImplementation((_channel: string, request: { requestId: string }) => {
      handleBindingConflictResponse(request.requestId, 'sync_to_current');
    });

    const result = await checkAndResolveBindingConflict('/vault');

    expect(result).toEqual({
      hasConflict: true,
      choice: 'stay_offline',
    });
  });
});
