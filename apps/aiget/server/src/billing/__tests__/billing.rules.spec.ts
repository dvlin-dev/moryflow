/**
 * Billing Rules Tests
 *
 * [PROVIDES]: billing.rules.ts 单元测试
 * [POS]: 测试计费规则获取、环境变量覆盖
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getBillingRule,
  BILLING_KEYS,
  DEFAULT_BILLING_COST,
  type BillingKey,
} from '../billing.rules';

describe('billing.rules', () => {
  // 保存原始环境变量
  const originalEnv = process.env.BILLING_RULE_OVERRIDES_JSON;

  beforeEach(() => {
    // 清理缓存（需要重新加载模块）
    vi.resetModules();
  });

  afterEach(() => {
    // 恢复环境变量
    if (originalEnv !== undefined) {
      process.env.BILLING_RULE_OVERRIDES_JSON = originalEnv;
    } else {
      delete process.env.BILLING_RULE_OVERRIDES_JSON;
    }
  });

  // ========== BILLING_KEYS ==========

  describe('BILLING_KEYS', () => {
    it('should contain all Fetchx billing keys', () => {
      expect(BILLING_KEYS).toContain('fetchx.scrape');
      expect(BILLING_KEYS).toContain('fetchx.batchScrape');
      expect(BILLING_KEYS).toContain('fetchx.crawl');
      expect(BILLING_KEYS).toContain('fetchx.map');
      expect(BILLING_KEYS).toContain('fetchx.extract');
      expect(BILLING_KEYS).toContain('fetchx.search');
    });

    it('should contain all Memox billing keys', () => {
      expect(BILLING_KEYS).toContain('memox.memory.create');
      expect(BILLING_KEYS).toContain('memox.memory.search');
    });

    it('should have correct count', () => {
      expect(BILLING_KEYS.length).toBe(8);
    });
  });

  // ========== getBillingRule ==========

  describe('getBillingRule', () => {
    describe('base rules', () => {
      it('should return rule for fetchx.scrape', async () => {
        delete process.env.BILLING_RULE_OVERRIDES_JSON;
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1);
        expect(rule.skipIfFromCache).toBe(true);
        expect(rule.refundOnFailure).toBe(true);
      });

      it('should return rule for fetchx.batchScrape', async () => {
        delete process.env.BILLING_RULE_OVERRIDES_JSON;
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.batchScrape');

        expect(rule.cost).toBe(1);
        expect(rule.skipIfFromCache).toBeUndefined();
        expect(rule.refundOnFailure).toBe(true);
      });

      it('should return rule for memox.memory.create', async () => {
        delete process.env.BILLING_RULE_OVERRIDES_JSON;
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('memox.memory.create');

        expect(rule.cost).toBe(1);
        expect(rule.refundOnFailure).toBe(true);
      });

      it.each([
        'fetchx.scrape',
        'fetchx.batchScrape',
        'fetchx.crawl',
        'fetchx.map',
        'fetchx.extract',
        'fetchx.search',
        'memox.memory.create',
        'memox.memory.search',
      ] as BillingKey[])(
        'should return valid rule for %s',
        async (key: BillingKey) => {
          delete process.env.BILLING_RULE_OVERRIDES_JSON;
          const { getBillingRule: getRule } = await import('../billing.rules');

          const rule = getRule(key);

          expect(rule).toBeDefined();
          expect(typeof rule.cost).toBe('number');
          expect(rule.cost).toBeGreaterThanOrEqual(0);
        },
      );
    });

    describe('environment overrides', () => {
      it('should apply cost override from env', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 5,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(5);
        // Other properties should remain unchanged
        expect(rule.skipIfFromCache).toBe(true);
        expect(rule.refundOnFailure).toBe(true);
      });

      it('should apply multiple cost overrides', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 2,
          'fetchx.crawl': 10,
          'memox.memory.create': 3,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        expect(getRule('fetchx.scrape').cost).toBe(2);
        expect(getRule('fetchx.crawl').cost).toBe(10);
        expect(getRule('memox.memory.create').cost).toBe(3);
        // Non-overridden keys should use base cost
        expect(getRule('fetchx.map').cost).toBe(1);
      });

      it('should allow zero cost override', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 0,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(0);
      });

      it('should ignore invalid JSON', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = 'invalid json';
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1); // Default cost
      });

      it('should ignore negative cost values', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': -5,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1); // Default cost
      });

      it('should ignore non-number cost values', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 'five',
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1); // Default cost
      });

      it('should ignore Infinity cost values', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': Infinity,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1); // Default cost (Infinity is not finite)
      });

      it('should ignore unknown billing keys', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'unknown.key': 100,
          'fetchx.scrape': 5,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        expect(getRule('fetchx.scrape').cost).toBe(5);
      });

      it('should handle empty override JSON', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = '{}';
        const { getBillingRule: getRule } = await import('../billing.rules');

        const rule = getRule('fetchx.scrape');

        expect(rule.cost).toBe(1); // Default cost
      });
    });

    describe('caching', () => {
      it('should cache overrides across calls', async () => {
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 5,
        });
        const { getBillingRule: getRule } = await import('../billing.rules');

        // First call
        const rule1 = getRule('fetchx.scrape');
        expect(rule1.cost).toBe(5);

        // Change env (should not affect cached value in same module instance)
        process.env.BILLING_RULE_OVERRIDES_JSON = JSON.stringify({
          'fetchx.scrape': 10,
        });

        // Second call (should use cached value)
        const rule2 = getRule('fetchx.scrape');
        expect(rule2.cost).toBe(5);
      });
    });
  });

  // ========== DEFAULT_BILLING_COST ==========

  describe('DEFAULT_BILLING_COST', () => {
    it('should be 1', () => {
      expect(DEFAULT_BILLING_COST).toBe(1);
    });
  });
});
