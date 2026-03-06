import { describe, expect, it } from 'vitest';
import { buildEmbedRequest } from './schemas';
import type { EmbedFormValues } from './schemas';

function createEmbedFormValues(overrides: Partial<EmbedFormValues> = {}): EmbedFormValues {
  return {
    url: 'https://example.com/post/123',
    maxWidth: '550',
    maxHeight: '',
    theme: 'auto',
    ...overrides,
  };
}

describe('embed-playground schemas', () => {
  it('builds request with optional fields omitted', () => {
    const request = buildEmbedRequest(
      createEmbedFormValues({
        maxWidth: '',
        maxHeight: '',
        theme: 'auto',
      })
    );

    expect(request).toEqual({
      url: 'https://example.com/post/123',
      maxWidth: undefined,
      maxHeight: undefined,
      theme: undefined,
    });
  });

  it('builds request with numeric dimensions and explicit theme', () => {
    const request = buildEmbedRequest(
      createEmbedFormValues({
        maxWidth: '640',
        maxHeight: '480',
        theme: 'dark',
      })
    );

    expect(request).toEqual({
      url: 'https://example.com/post/123',
      maxWidth: 640,
      maxHeight: 480,
      theme: 'dark',
    });
  });
});
