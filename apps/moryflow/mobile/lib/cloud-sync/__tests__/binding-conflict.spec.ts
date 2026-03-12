import { beforeEach, describe, expect, it, vi } from 'vitest';

const { alertMock, readBindingMock, deleteBindingMock, fetchCurrentUserIdMock } = vi.hoisted(
  () => ({
    alertMock: vi.fn(),
    readBindingMock: vi.fn(),
    deleteBindingMock: vi.fn(),
    fetchCurrentUserIdMock: vi.fn(),
  })
);

vi.mock('react-native', () => ({
  Alert: {
    alert: alertMock,
  },
}));

vi.mock('../store', () => ({
  readBinding: readBindingMock,
  deleteBinding: deleteBindingMock,
}));

vi.mock('../user-info', () => ({
  fetchCurrentUserId: fetchCurrentUserIdMock,
  clearUserIdCache: vi.fn(),
}));

vi.mock('@/lib/agent-runtime', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

import { checkAndResolveBindingConflict } from '../binding-conflict';

describe('checkAndResolveBindingConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readBindingMock.mockResolvedValue({
      localPath: '/vault',
      vaultId: 'vault-old',
      vaultName: 'workspace',
      boundAt: Date.now(),
      userId: 'user-old',
    });
    deleteBindingMock.mockResolvedValue(true);
    fetchCurrentUserIdMock.mockResolvedValue('user-new');
    alertMock.mockImplementation(
      (_title: string, _message: string, buttons: Array<{ onPress?: () => void }>) => {
        buttons[1]?.onPress?.();
      }
    );
  });

  it('returns previous binding and deletes old binding before rebinding to the current account', async () => {
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
    deleteBindingMock.mockResolvedValue(false);

    const result = await checkAndResolveBindingConflict('/vault');

    expect(result).toEqual({
      hasConflict: true,
      choice: 'stay_offline',
    });
  });
});
