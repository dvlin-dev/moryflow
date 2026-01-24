/**
 * NetworkInterceptorService 单元测试
 *
 * 验证路由绑定与规则清理行为
 */

import { describe, it, expect, vi } from 'vitest';
import type { UrlValidator } from '../../common/validators/url.validator';
import type { BrowserContext } from 'playwright';
import { NetworkInterceptorService } from '../network/interceptor.service';

const createContext = () =>
  ({
    route: vi.fn().mockResolvedValue(undefined),
    unroute: vi.fn().mockResolvedValue(undefined),
  }) as unknown as BrowserContext;

const createUrlValidator = () =>
  ({ isAllowed: vi.fn().mockResolvedValue(true) }) as unknown as UrlValidator;

describe('NetworkInterceptorService', () => {
  it('attaches routing to new contexts when rules exist', async () => {
    const service = new NetworkInterceptorService(createUrlValidator());
    const contextA = createContext();
    const contextB = createContext();

    await service.setRules('session-1', contextA, [
      { id: 'rule-1', urlPattern: '*', block: true },
    ]);
    await service.registerContext('session-1', contextB);

    expect(contextA.route).toHaveBeenCalled();
    expect(contextB.route).toHaveBeenCalled();
  });

  it('removes routing when last rule is removed', async () => {
    const service = new NetworkInterceptorService(createUrlValidator());
    const context = createContext();

    await service.setRules('session-1', context, [
      { id: 'rule-1', urlPattern: '*', block: true },
    ]);
    const removed = service.removeRule('session-1', 'rule-1');

    expect(removed).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(context.unroute).toHaveBeenCalled();
  });
});
