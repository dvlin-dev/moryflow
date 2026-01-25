/**
 * ActionBatchSchema 单元测试
 */

import { describe, it, expect } from 'vitest';
import { ActionBatchSchema } from '../dto/action-batch.schema';

describe('ActionBatchSchema', () => {
  it('requires at least one action', () => {
    const result = ActionBatchSchema.safeParse({ actions: [] });
    expect(result.success).toBe(false);
  });

  it('defaults stopOnError to true', () => {
    const result = ActionBatchSchema.parse({
      actions: [{ type: 'click', selector: '#ok' }],
    });
    expect(result.stopOnError).toBe(true);
  });

  it('rejects more than 50 actions', () => {
    const actions = Array.from({ length: 51 }, () => ({
      type: 'click',
      selector: '#ok',
    }));
    const result = ActionBatchSchema.safeParse({ actions });
    expect(result.success).toBe(false);
  });
});
