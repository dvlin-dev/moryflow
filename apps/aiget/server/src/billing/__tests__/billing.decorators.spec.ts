/**
 * Billing Decorators Tests
 *
 * [PROVIDES]: @BillingKey 装饰器单元测试
 * [POS]: 测试装饰器元数据设置
 */

import { describe, it, expect } from 'vitest';
import { Reflector } from '@nestjs/core';
import { BillingKey, BILLING_KEY_METADATA } from '../billing.decorators';

describe('BillingKey decorator', () => {
  const reflector = new Reflector();

  it('should set metadata with billing key', () => {
    class TestController {
      @BillingKey('fetchx.scrape')
      scrape() {}
    }

    const metadata = reflector.get(
      BILLING_KEY_METADATA,
      TestController.prototype.scrape,
    );
    expect(metadata).toBe('fetchx.scrape');
  });

  it('should export BILLING_KEY_METADATA constant', () => {
    expect(BILLING_KEY_METADATA).toBe('aiget.billingKey');
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
  ] as const)('should set metadata for billing key: %s', (billingKey) => {
    class TestController {
      @BillingKey(billingKey)
      method() {}
    }

    expect(
      reflector.get(BILLING_KEY_METADATA, TestController.prototype.method),
    ).toBe(billingKey);
  });

  it('should work with class methods that have parameters', () => {
    class TestController {
      @BillingKey('fetchx.scrape')
      scrape(url: string, options?: { timeout: number }) {
        return { url, options };
      }
    }

    const metadata = reflector.get(
      BILLING_KEY_METADATA,
      TestController.prototype.scrape,
    );
    expect(metadata).toBe('fetchx.scrape');
  });

  it('should work with async methods', () => {
    class TestController {
      @BillingKey('fetchx.crawl')
      async crawl() {
        return Promise.resolve('result');
      }
    }

    const metadata = reflector.get(
      BILLING_KEY_METADATA,
      TestController.prototype.crawl,
    );
    expect(metadata).toBe('fetchx.crawl');
  });
});
