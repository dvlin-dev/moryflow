import { describe, expect, it } from 'vitest';
import { getPaidUsers } from './DashboardPage';

describe('getPaidUsers', () => {
  it('should include starter/basic/pro in paid users total', () => {
    const usersByTier = {
      free: 10,
      starter: 3,
      basic: 4,
      pro: 5,
    };

    expect(getPaidUsers(usersByTier)).toBe(12);
  });

  it('should return 0 when tier data is missing', () => {
    expect(getPaidUsers(undefined)).toBe(0);
  });

  it('should handle zero values safely', () => {
    const usersByTier = {
      free: 10,
      starter: 0,
      basic: 0,
      pro: 2,
    };

    expect(getPaidUsers(usersByTier)).toBe(2);
  });
});
