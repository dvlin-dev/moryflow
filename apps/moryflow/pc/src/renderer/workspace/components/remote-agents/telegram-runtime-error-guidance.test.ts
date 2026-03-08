import { describe, expect, it } from 'vitest';
import {
  resolveTelegramProxyGuidance,
  TELEGRAM_PROXY_HINT_WHEN_DISABLED,
  TELEGRAM_PROXY_HINT_WHEN_ENABLED,
} from './telegram-runtime-error-guidance';

describe('resolveTelegramProxyGuidance', () => {
  it('网络错误且 proxy 关闭时，提示开启 proxy', () => {
    const hint = resolveTelegramProxyGuidance({
      errorMessage: "Network request for 'getMe' failed!",
      proxyEnabled: false,
    });
    expect(hint).toBe(TELEGRAM_PROXY_HINT_WHEN_DISABLED);
  });

  it('网络错误且 proxy 已开启时，提示检查代理并测试', () => {
    const hint = resolveTelegramProxyGuidance({
      errorMessage: 'fetch failed: ETIMEDOUT while calling Telegram API',
      proxyEnabled: true,
    });
    expect(hint).toBe(TELEGRAM_PROXY_HINT_WHEN_ENABLED);
  });

  it('非网络错误时不提示 proxy 引导', () => {
    const hint = resolveTelegramProxyGuidance({
      errorMessage: 'Unauthorized',
      proxyEnabled: false,
    });
    expect(hint).toBeNull();
  });
});
