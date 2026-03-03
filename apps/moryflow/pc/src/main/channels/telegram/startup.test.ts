/* @vitest-environment node */

import { describe, expect, it, vi } from 'vitest';
import { initTelegramChannelForAppStartup } from './startup.js';

describe('initTelegramChannelForAppStartup', () => {
  it('init 成功时直接返回', async () => {
    const service = {
      init: vi.fn(async () => undefined),
    };
    const logger = {
      error: vi.fn(),
    };

    await expect(initTelegramChannelForAppStartup(service, logger)).resolves.toBeUndefined();
    expect(service.init).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('init 失败时记录错误并继续', async () => {
    const service = {
      init: vi.fn(async () => {
        throw new Error('startup failed');
      }),
    };
    const logger = {
      error: vi.fn(),
    };

    await expect(initTelegramChannelForAppStartup(service, logger)).resolves.toBeUndefined();
    expect(service.init).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      '[telegram-channel] init failed, continuing without Telegram',
      expect.any(Error)
    );
  });
});
