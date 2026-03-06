import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAccessTokenMock, fetchCurrentUserMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  fetchCurrentUserMock: vi.fn(),
}));

vi.mock('@/lib/server/auth-session', () => ({
  getAccessToken: getAccessTokenMock,
}));

vi.mock('@/lib/server/api', () => ({
  fetchCurrentUser: fetchCurrentUserMock,
}));

vi.mock('@/lib/agent-runtime', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(() => undefined),
    warn: vi.fn(() => undefined),
    error: vi.fn(() => undefined),
  })),
}));

import { clearUserIdCache, fetchCurrentUserId } from '../user-info';

describe('mobile cloud-sync user-info', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserIdCache();
  });

  it('returns null when access token is missing', async () => {
    getAccessTokenMock.mockReturnValue(null);

    const userId = await fetchCurrentUserId();

    expect(userId).toBeNull();
    expect(fetchCurrentUserMock).not.toHaveBeenCalled();
  });

  it('caches user id by token', async () => {
    getAccessTokenMock.mockReturnValue('token-a');
    fetchCurrentUserMock.mockResolvedValue({ id: 'user-a' });

    const first = await fetchCurrentUserId();
    const second = await fetchCurrentUserId();

    expect(first).toBe('user-a');
    expect(second).toBe('user-a');
    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(1);
  });

  it('refetches when token changes', async () => {
    let token = 'token-a';
    getAccessTokenMock.mockImplementation(() => token);
    fetchCurrentUserMock
      .mockResolvedValueOnce({ id: 'user-a' })
      .mockResolvedValueOnce({ id: 'user-b' });

    const first = await fetchCurrentUserId();
    token = 'token-b';
    const second = await fetchCurrentUserId();

    expect(first).toBe('user-a');
    expect(second).toBe('user-b');
    expect(fetchCurrentUserMock).toHaveBeenCalledTimes(2);
  });
});
