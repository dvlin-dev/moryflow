import { describe, expect, it } from 'vitest';
import { getCreditsCycleSuffix } from './cycle';

describe('getCreditsCycleSuffix', () => {
  it('monthly 返回 /月', () => {
    expect(getCreditsCycleSuffix('monthly')).toBe('/月');
  });

  it('yearly 返回 /月（保持现有展示语义）', () => {
    expect(getCreditsCycleSuffix('yearly')).toBe('/月');
  });

  it('其他周期返回空字符串', () => {
    expect(getCreditsCycleSuffix('one-time')).toBe('');
    expect(getCreditsCycleSuffix(undefined)).toBe('');
  });
});
