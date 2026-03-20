import { describe, it, expect, vi } from 'vitest';

let capturedConfig: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => {
    capturedConfig = config;
    return { Route: config };
  },
}));

describe('health route', () => {
  it('returns ok JSON with correct content-type', async () => {
    vi.resetModules();
    capturedConfig = {};
    await import('../../routes/api/v1/health');

    const server = capturedConfig.server as { handlers: { GET: () => Promise<Response> } };
    const response = await server.handlers.GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    const body = await response.json();
    expect(body).toEqual({ ok: true, status: 'ok' });
  });
});
