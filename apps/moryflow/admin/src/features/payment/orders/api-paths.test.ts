import { describe, expect, it } from 'vitest';
import { buildOrdersListPath } from './query-paths';

describe('orders api path builders', () => {
  it('应包含基础分页参数', () => {
    const path = buildOrdersListPath({ limit: 20, offset: 40 });
    expect(path).toBe('/payment/orders?limit=20&offset=40');
  });

  it('应忽略 status=all 与 productType=all', () => {
    const path = buildOrdersListPath({
      limit: 20,
      offset: 0,
      status: 'all',
      productType: 'all',
    });
    expect(path).toBe('/payment/orders?limit=20&offset=0');
  });

  it('应序列化 status 与 productType', () => {
    const path = buildOrdersListPath({
      limit: 10,
      offset: 20,
      status: 'completed',
      productType: 'subscription',
    });
    expect(path).toBe('/payment/orders?limit=10&offset=20&status=completed&productType=subscription');
  });
});
