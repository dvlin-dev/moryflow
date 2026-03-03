/**
 * [PROVIDES]: Telegram channel service 主进程导出
 * [DEPENDS]: service.ts
 * [POS]: PC Telegram 渠道模块入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export { telegramChannelService } from './service.js';
export type {
  TelegramSettingsSnapshot,
  TelegramSettingsUpdateInput,
  TelegramRuntimeStatusSnapshot,
  TelegramPairingRequestItem,
} from './types.js';
