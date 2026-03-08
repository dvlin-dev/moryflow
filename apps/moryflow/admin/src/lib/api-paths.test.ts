import { describe, expect, it } from 'vitest';
import { AI_PROXY_API } from './api-paths';

describe('AI_PROXY_API', () => {
  it('uses the server api prefix for compatibility endpoints', () => {
    expect(AI_PROXY_API.MODELS).toBe('/api/v1/models');
    expect(AI_PROXY_API.CHAT_COMPLETIONS).toBe('/api/v1/chat/completions');
    expect(AI_PROXY_API.IMAGES_GENERATIONS).toBe('/api/v1/images/generations');
  });
});
