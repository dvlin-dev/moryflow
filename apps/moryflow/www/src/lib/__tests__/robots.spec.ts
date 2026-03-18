import { describe, it, expect, vi } from 'vitest';

let capturedConfig: Record<string, unknown> = {};

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (config: Record<string, unknown>) => {
    capturedConfig = config;
    return { Route: config };
  },
}));

describe('robots.txt route', () => {
  it('includes sitemap entry with www host', async () => {
    vi.resetModules();
    capturedConfig = {};
    await import('../../routes/robots[.]txt');

    const server = capturedConfig.server as { handlers: { GET: () => Promise<Response> } };
    const response = await server.handlers.GET();
    const body = await response.text();

    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(body).toContain('Sitemap: https://www.moryflow.com/sitemap.xml');
    expect(body).toContain('Disallow: /api/v1/');
  });
});
