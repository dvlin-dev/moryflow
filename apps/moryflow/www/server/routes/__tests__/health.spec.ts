import { describe, it, expect } from 'vitest';
import handler from '../api/health';

describe('health route', () => {
  it('returns ok JSON', async () => {
    const response = await handler({} as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body).toEqual({ ok: true, status: 'ok' });
  });
});
