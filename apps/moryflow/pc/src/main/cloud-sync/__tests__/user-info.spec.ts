/* @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfigMock, getUserMock } = vi.hoisted(() => ({
  getConfigMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock('@moryflow/api', () => ({
  MEMBERSHIP_API_URL: 'https://membership.test',
  USER_API: { ME: '/me' },
  createApiClient: vi.fn(() => ({
    get: getUserMock,
  })),
}));

vi.mock('../../membership/bridge.js', () => ({
  membershipBridge: {
    getConfig: getConfigMock,
  },
}));

import { clearUserIdCache, fetchCurrentUserId } from '../user-info';

describe('fetchCurrentUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserIdCache();
  });

  it('returns null when token is missing', async () => {
    getConfigMock.mockReturnValue({ token: null });

    const userId = await fetchCurrentUserId();

    expect(userId).toBeNull();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('caches user id by token', async () => {
    getConfigMock.mockReturnValue({ token: 'token-a' });
    getUserMock.mockResolvedValue({ id: 'user-a' });

    const first = await fetchCurrentUserId();
    const second = await fetchCurrentUserId();

    expect(first).toBe('user-a');
    expect(second).toBe('user-a');
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it('refetches user id after token changes', async () => {
    let token = 'token-a';
    getConfigMock.mockImplementation(() => ({ token }));
    getUserMock.mockResolvedValueOnce({ id: 'user-a' }).mockResolvedValueOnce({ id: 'user-b' });

    const first = await fetchCurrentUserId();
    token = 'token-b';
    const second = await fetchCurrentUserId();

    expect(first).toBe('user-a');
    expect(second).toBe('user-b');
    expect(getUserMock).toHaveBeenCalledTimes(2);
  });
});
