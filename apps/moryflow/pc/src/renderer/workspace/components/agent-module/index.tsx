/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Home Modules 的 Agent 一级页面（Telegram 配置主路径）
 * [UPDATE]: 2026-03-05 - 修复 Developer Settings 展开后滚动导致侧栏布局异常；isolate 隔离滚动上下文
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
