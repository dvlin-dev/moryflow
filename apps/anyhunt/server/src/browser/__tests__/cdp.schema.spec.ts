/**
 * ConnectCdpSchemaRefined 单元测试
 *
 * 覆盖 CDP 连接参数校验边界
 */

import { describe, expect, it } from 'vitest';
import { ConnectCdpSchemaRefined } from '../dto/cdp.schema';

describe('ConnectCdpSchemaRefined', () => {
  it('accepts wsEndpoint input', () => {
    const result = ConnectCdpSchemaRefined.safeParse({
      wsEndpoint: 'ws://localhost:9222/devtools/browser/abc',
      timeout: 30000,
    });

    expect(result.success).toBe(true);
  });

  it('accepts port-only input', () => {
    const result = ConnectCdpSchemaRefined.safeParse({
      port: 9222,
      timeout: 30000,
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty input and reports wsEndpoint/port requirement', () => {
    const result = ConnectCdpSchemaRefined.safeParse({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === 'wsEndpoint' &&
            issue.message === 'wsEndpoint or port is required',
        ),
      ).toBe(true);
    }
  });

  it('rejects legacy provider-only payload', () => {
    const result = ConnectCdpSchemaRefined.safeParse({
      provider: 'browserbase',
    });

    expect(result.success).toBe(false);
  });
});
