import { describe, expect, it, vi } from 'vitest';

vi.mock('@openai/agents-core', () => ({
  tool: (definition: unknown) => definition,
}));

import { createGenerateImageTool } from '../src/image/generate-image-tool';

describe('createGenerateImageTool', () => {
  it('calls the canonical api v1 image generation route', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            created: Date.now(),
            data: [{ url: 'https://example.com/generated.png' }],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        )
    );

    const tool = createGenerateImageTool({
      fetch: fetchMock as typeof fetch,
      auth: {
        getToken: async () => 'token',
        getApiUrl: () => 'https://server.moryflow.com',
      },
    } as any);

    const result = await tool.execute({ prompt: 'A cat astronaut' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://server.moryflow.com/api/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(result).toMatchObject({
      success: true,
      count: 1,
    });
  });
});
