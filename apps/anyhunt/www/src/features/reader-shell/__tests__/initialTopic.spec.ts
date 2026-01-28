/**
 * [INPUT]: normalizeInitialTopic 输入样本
 * [OUTPUT]: 归一化后的初始主题结果
 * [POS]: Reader Shell 初始主题归一化回归测试
 */

import { describe, expect, it } from 'vitest';
import { normalizeInitialTopic } from '../initialTopic';

describe('normalizeInitialTopic', () => {
  it('keeps string input', () => {
    expect(normalizeInitialTopic('AI Digest')).toBe('AI Digest');
  });

  it('returns undefined for non-string input', () => {
    expect(normalizeInitialTopic({ type: 'click' })).toBeUndefined();
    expect(normalizeInitialTopic(123)).toBeUndefined();
    expect(normalizeInitialTopic(undefined)).toBeUndefined();
  });
});
