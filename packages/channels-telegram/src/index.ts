/**
 * [PROVIDES]: channels-telegram 公共导出
 * [DEPENDS]: config/telegram-runtime/target/normalize-update/types/commands
 * [POS]: Telegram 渠道适配包入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export * from './types';
export * from './config';
export * from './target';
export * from './normalize-update';
export * from './commands';
export * from './telegram-runtime';
