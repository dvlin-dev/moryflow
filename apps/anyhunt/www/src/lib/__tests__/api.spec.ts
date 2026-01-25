import { describe, expect, it } from 'vitest';
import { ApiError, parseJsonResponse } from '@/lib/api';

describe('parseJsonResponse', () => {
  it('throws UNEXPECTED_RESPONSE when content-type is not json', async () => {
    const response = new Response('ok', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });

    await expect(parseJsonResponse<{ ok: boolean }>(response)).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('throws UNEXPECTED_RESPONSE when json is invalid', async () => {
    const response = new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    await expect(parseJsonResponse<{ ok: boolean }>(response)).rejects.toBeInstanceOf(ApiError);
  });

  it('includes UNEXPECTED_RESPONSE code when json is invalid', async () => {
    const response = new Response('not-json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    await expect(parseJsonResponse<{ ok: boolean }>(response)).rejects.toMatchObject({
      code: 'UNEXPECTED_RESPONSE',
    });
  });
});
