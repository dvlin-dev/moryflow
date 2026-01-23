/**
 * fetchWithSsrGuard 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { UrlValidator } from '../validators/url.validator';
import { fetchWithSsrGuard } from '../utils/ssrf-fetch';

type MockResponse = {
  status: number;
  ok?: boolean;
  headers: { get: (name: string) => string | null };
};

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('fetchWithSsrGuard', () => {
  let mockValidator: { isAllowed: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidator = {
      isAllowed: vi.fn(),
    };
  });

  it('should return response when URL is allowed', async () => {
    mockValidator.isAllowed.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => null },
    } satisfies MockResponse);

    const response = await fetchWithSsrGuard(
      mockValidator as unknown as UrlValidator,
      'https://example.com',
    );

    expect(response.status).toBe(200);
    expect(mockValidator.isAllowed).toHaveBeenCalledWith('https://example.com');
  });

  it('should reject when URL is not allowed', async () => {
    mockValidator.isAllowed.mockResolvedValue(false);

    await expect(
      fetchWithSsrGuard(
        mockValidator as unknown as UrlValidator,
        'https://example.com',
      ),
    ).rejects.toThrow('URL not allowed');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should follow redirects with validation', async () => {
    mockValidator.isAllowed.mockResolvedValue(true);
    mockFetch
      .mockResolvedValueOnce({
        status: 302,
        headers: { get: () => 'https://example.com/next' },
      } satisfies MockResponse)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => null },
      } satisfies MockResponse);

    const response = await fetchWithSsrGuard(
      mockValidator as unknown as UrlValidator,
      'https://example.com',
      { maxRedirects: 2 },
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it('should reject redirects to blocked URL', async () => {
    mockValidator.isAllowed
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    mockFetch.mockResolvedValue({
      status: 302,
      headers: { get: () => 'http://localhost/internal' },
    } satisfies MockResponse);

    await expect(
      fetchWithSsrGuard(
        mockValidator as unknown as UrlValidator,
        'https://example.com',
        { maxRedirects: 2 },
      ),
    ).rejects.toThrow('URL not allowed');
  });

  it('should reject too many redirects', async () => {
    mockValidator.isAllowed.mockResolvedValue(true);
    mockFetch.mockResolvedValue({
      status: 302,
      headers: { get: () => 'https://example.com/loop' },
    } satisfies MockResponse);

    await expect(
      fetchWithSsrGuard(
        mockValidator as unknown as UrlValidator,
        'https://example.com',
        { maxRedirects: 0 },
      ),
    ).rejects.toThrow('Too many redirects');
  });
});
