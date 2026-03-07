/**
 * [PROVIDES]: Telegram channel service 主进程导出
 * [DEPENDS]: service.ts
 * [POS]: PC Telegram 渠道模块入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
