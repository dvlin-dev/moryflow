import { describe, expect, it } from 'vitest';
import { buildSubscriptionsListPath } from './query-paths';

describe('subscriptions api path builders', () => {
  it('应包含基础分页参数', () => {
    const path = buildSubscriptionsListPath({ limit: 20, offset: 40 });
    expect(path).toBe('/payment/subscriptions?limit=20&offset=40');
  });

  it('应忽略 status=all', () => {
    const path = buildSubscriptionsListPath({ limit: 20, offset: 0, status: 'all' });
    expect(path).toBe('/payment/subscriptions?limit=20&offset=0');
  });

  it('应序列化 status', () => {
    const path = buildSubscriptionsListPath({ limit: 10, offset: 20, status: 'active' });
    expect(path).toBe('/payment/subscriptions?limit=10&offset=20&status=active');
  });
});
