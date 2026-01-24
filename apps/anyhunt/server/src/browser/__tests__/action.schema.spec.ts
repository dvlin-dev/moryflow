/**
 * ActionSchema 单元测试
 *
 * 覆盖动作参数的必要校验逻辑
 */

import { describe, it, expect } from 'vitest';
import { ActionSchema } from '../dto/action.schema';

describe('ActionSchema', () => {
  it('requires selector for click', () => {
    const result = ActionSchema.safeParse({ type: 'click' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'selector'),
      ).toBe(true);
    }
  });

  it('requires value for fill', () => {
    const result = ActionSchema.safeParse({
      type: 'fill',
      selector: '#input',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'value'),
      ).toBe(true);
    }
  });

  it('requires options for selectOption', () => {
    const result = ActionSchema.safeParse({
      type: 'selectOption',
      selector: '#select',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'options'),
      ).toBe(true);
    }
  });

  it('requires key for press', () => {
    const result = ActionSchema.safeParse({
      type: 'press',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'key')).toBe(
        true,
      );
    }
  });

  it('requires wait condition', () => {
    const result = ActionSchema.safeParse({
      type: 'wait',
      waitFor: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.path[0] === 'waitFor'),
      ).toBe(true);
    }
  });

  it('accepts minimal valid action', () => {
    const result = ActionSchema.safeParse({
      type: 'click',
      selector: '#submit',
    });
    expect(result.success).toBe(true);
  });
});
