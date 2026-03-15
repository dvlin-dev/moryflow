/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Home Modules 的 Remote Agents 一级页面（当前承载 Telegram 远程入口）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { RemoteAgentSection } from './remote-agent-section';
import { TelegramSection } from './telegram-section';

export const RemoteAgentsPage = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Remote Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage remote entry points for your workspace.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        <div className="mx-auto max-w-2xl pb-8">
          <RemoteAgentSection
            title="Telegram"
            description="Configure the Telegram bot entry point for this workspace."
          >
            <TelegramSection />
          </RemoteAgentSection>
        </div>
      </div>
    </div>
  );
};
