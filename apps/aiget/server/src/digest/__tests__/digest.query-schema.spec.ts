/**
 * Digest Query Schemas 单元测试
 * 重点覆盖：page/limit 默认值与布尔 query string 解析
 */

import { describe, it, expect } from 'vitest';
import { InboxQuerySchema, ListSubscriptionsQuerySchema } from '../dto';

describe('Digest Query Schemas', () => {
  it('should default page/limit when omitted', () => {
    const result = InboxQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should parse boolean query strings correctly', () => {
    const inboxQuery = InboxQuerySchema.parse({
      saved: 'false',
      unread: 'true',
      notInterested: 'false',
    });

    expect(inboxQuery.saved).toBe(false);
    expect(inboxQuery.unread).toBe(true);
    expect(inboxQuery.notInterested).toBe(false);
  });

  it('should parse enabled=false for subscription list', () => {
    const query = ListSubscriptionsQuerySchema.parse({ enabled: 'false' });
    expect(query.enabled).toBe(false);
  });
});
