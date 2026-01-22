import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getProductTierMap,
  getCreditPacks,
  getLicenseConfig,
} from './pricing.config';

describe('pricing.config', () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    process.env = { ...envSnapshot };
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it('空产品 ID 不应写入 Tier 映射', () => {
    process.env.CREEM_PRODUCT_STARTER_MONTHLY = '';
    process.env.CREEM_PRODUCT_BASIC_MONTHLY = '';

    const map = getProductTierMap();

    expect(Object.keys(map)).toHaveLength(0);
    expect(map['']).toBeUndefined();
  });

  it('积分包配置仅收录有效产品 ID', () => {
    process.env.CREEM_PRODUCT_CREDITS_5000 = 'credits_5000';
    process.env.CREEM_PRODUCT_CREDITS_10000 = '';

    const packs = getCreditPacks();

    expect(packs).toEqual({ credits_5000: 5000 });
  });

  it('License 配置仅收录有效产品 ID', () => {
    process.env.CREEM_PRODUCT_LICENSE_STANDARD = 'license_standard';
    process.env.CREEM_PRODUCT_LICENSE_PRO = '';

    const config = getLicenseConfig();

    expect(config).toEqual({
      license_standard: { tier: 'standard', activationLimit: 2 },
    });
  });
});
