/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Home Modules 的 Agent 一级页面（Telegram 配置主路径）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { TelegramSection } from './telegram-section';

export const AgentModulePage = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Agent</h1>
        <p className="text-sm text-muted-foreground">Telegram channel configuration.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        <div className="mx-auto max-w-2xl pb-8">
          <TelegramSection />
        </div>
      </div>
    </div>
  );
};
