/**
 * HeadersSchema 单元测试
 */

import { describe, it, expect } from 'vitest';
import { SetHeadersSchema, ClearHeadersSchema } from '../dto/headers.schema';

describe('HeadersSchema', () => {
  it('requires headers for set', () => {
    const result = SetHeadersSchema.safeParse({
      origin: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('accepts global headers', () => {
    const result = SetHeadersSchema.safeParse({
      headers: { 'x-test': '1' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts scoped headers', () => {
    const result = SetHeadersSchema.safeParse({
      origin: 'example.com',
      headers: { Authorization: 'Bearer token' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts clear headers request', () => {
    const result = ClearHeadersSchema.safeParse({
      clearGlobal: true,
    });
    expect(result.success).toBe(true);
  });
});
