/**
 * [PROVIDES]: resolveTelegramProxyGuidance - Telegram 运行时错误到 Proxy 引导文案的纯函数映射
 * [DEPENDS]: none
 * [POS]: Agent Telegram 配置页错误提示策略（避免在 UI 组件内散落字符串匹配）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

const NETWORK_ERROR_PATTERNS: RegExp[] = [
  /network request/i,
  /\betimedout\b/i,
  /\beconnrefused\b/i,
  /\benetunreach\b/i,
  /\behostunreach\b/i,
  /\benotfound\b/i,
  /fetch failed/i,
  /socket hang up/i,
  /client network socket disconnected/i,
];

const TELEGRAM_CONTEXT_PATTERNS: RegExp[] = [/getme/i, /api\.telegram\.org/i, /telegram api/i];

export const TELEGRAM_PROXY_HINT_WHEN_DISABLED =
  'Network issue detected while contacting Telegram API. If Telegram is blocked in your environment, enable Proxy and click Test Proxy.';

export const TELEGRAM_PROXY_HINT_WHEN_ENABLED =
  'Network issue detected while contacting Telegram API. Check Proxy URL and click Test Proxy.';

const isLikelyTelegramNetworkError = (errorMessage: string): boolean => {
  if (!NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return false;
  }
  if (TELEGRAM_CONTEXT_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return true;
  }
  // 某些 runtime/SDK 只返回“network request failed”而不含明确 API 上下文。
  return /network request/i.test(errorMessage);
};

export const resolveTelegramProxyGuidance = (input: {
  errorMessage?: string | null;
  proxyEnabled: boolean;
}): string | null => {
  const message = input.errorMessage?.trim() ?? '';
  if (!message) {
    return null;
  }
  if (!isLikelyTelegramNetworkError(message)) {
    return null;
  }
  return input.proxyEnabled ? TELEGRAM_PROXY_HINT_WHEN_ENABLED : TELEGRAM_PROXY_HINT_WHEN_DISABLED;
};
