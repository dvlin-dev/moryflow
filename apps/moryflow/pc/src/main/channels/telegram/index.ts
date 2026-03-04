/**
 * [PROVIDES]: Telegram channel service 主进程导出
 * [DEPENDS]: service.ts
 * [POS]: PC Telegram 渠道模块入口
 * [UPDATE]: 2026-03-05 - 导出自动代理探测类型（TelegramProxySuggestionInput/Result）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { telegramChannelService } from './service.js';
export type {
  TelegramProxySuggestionInput,
  TelegramProxySuggestionResult,
  TelegramProxyTestInput,
  TelegramProxyTestResult,
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
  TelegramRuntimeStatusSnapshot,
  TelegramPairingRequestItem,
} from './types.js';
