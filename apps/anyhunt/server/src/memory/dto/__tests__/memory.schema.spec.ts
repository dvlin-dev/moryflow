/**
 * Memory DTO schema 单元测试
 * 覆盖 query 参数兼容与导出契约收口
 */

import { describe, expect, it } from 'vitest';
import {
  ListMemoryQuerySchema,
  SearchMemorySchema,
  ExportCreateSchema,
} from '../memory.schema';

describe('Memory DTO schemas', () => {
  it('should normalize search fields/categories from comma-separated string', () => {
    const parsed = SearchMemorySchema.parse({
      query: 'coffee',
      fields: 'id,content,metadata',
      categories: 'food,drink',
    });

    expect(parsed.fields).toEqual(['id', 'content', 'metadata']);
    expect(parsed.categories).toEqual(['food', 'drink']);
  });

  it('should normalize list fields/categories from mixed signatures', () => {
    const parsed = ListMemoryQuerySchema.parse({
      categories: ['cat-a', 'cat-b'],
      fields: 'id,content',
    });

    expect(parsed.categories).toEqual(['cat-a', 'cat-b']);
    expect(parsed.fields).toEqual(['id', 'content']);
  });

  it('should reject deprecated export schema field', () => {
    expect(() =>
      ExportCreateSchema.parse({
        schema: { version: 'v1' },
        filters: { user_id: 'u-1' },
      }),
    ).toThrow();
  });
});
