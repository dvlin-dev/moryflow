/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Home Modules 的 Agent 一级页面（Telegram 配置主路径）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { TelegramSection } from './telegram-section';

export const AgentModulePage = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Agent</h1>
        <p className="text-sm text-muted-foreground">Telegram channel configuration.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
        <TelegramSection />
      </div>
    </div>
  );
};
