import { describe, expect, it } from 'vitest';
import { OPENAI_API } from '../paths';

describe('OPENAI_API', () => {
  it('uses the server api prefix for compatibility endpoints', () => {
    expect(OPENAI_API.MODELS).toBe('/api/v1/models');
    expect(OPENAI_API.CHAT_COMPLETIONS).toBe('/api/v1/chat/completions');
  });
});
