import { describe, expect, it } from 'vitest';
import { getMembershipTierConfig } from '../membership-tier-config';

describe('getMembershipTierConfig', () => {
  it('returns dedicated starter style instead of falling back to free style', () => {
    const starterConfig = getMembershipTierConfig('starter');
    const freeConfig = getMembershipTierConfig('free');

    expect(starterConfig.colorKey).toBe('success');
    expect(starterConfig.bgClass).toBe('bg-success-bg');
    expect(starterConfig.textClass).toBe('text-success');
    expect(starterConfig.bgClass).not.toBe(freeConfig.bgClass);
    expect(starterConfig.textClass).not.toBe(freeConfig.textClass);
  });

  it('keeps pro tier crown icon', () => {
    expect(getMembershipTierConfig('pro').icon).toBe('crown');
  });
});
