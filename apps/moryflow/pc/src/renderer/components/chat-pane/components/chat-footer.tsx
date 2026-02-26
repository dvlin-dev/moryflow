/**
 * [PROPS]: 无（通过 chat-pane-footer-store selector 取数）
 * [EMITS]: onSubmit/onStop/onInputError/onOpenSettings/onModeChange
 * [POS]: ChatPane 底部区域（任务悬浮条 + 输入框 + 错误提示）
 * [UPDATE]: 2026-02-02 - 对齐悬浮任务面板宽度与垂直间距
 * [UPDATE]: 2026-02-03 - 仅在会话运行时触发任务面板展示
 * [UPDATE]: 2026-02-11 - 透传 selectedSkill 到输入框，支持显式 skill 注入
 * [UPDATE]: 2026-02-26 - 改为就地读取 chat-pane-footer-store，移除上层 props 平铺
 * [UPDATE]: 2026-02-26 - 移除对象字面量 selector，改为原子 selector，避免 zustand v5 快照引用抖动
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { CardFooter } from '@moryflow/ui/components/card';

import { ChatPromptInput } from './chat-prompt-input';
import { TaskHoverPanel } from './task-hover-panel';
import { useChatPaneFooterStore } from '../hooks/use-chat-pane-footer-store';

export const ChatFooter = () => {
  const status = useChatPaneFooterStore((state) => state.status);
  const inputError = useChatPaneFooterStore((state) => state.inputError);
  const activeFilePath = useChatPaneFooterStore((state) => state.activeFilePath);
  const activeFileContent = useChatPaneFooterStore((state) => state.activeFileContent);
  const vaultPath = useChatPaneFooterStore((state) => state.vaultPath);
  const modelGroups = useChatPaneFooterStore((state) => state.modelGroups);
  const selectedModelId = useChatPaneFooterStore((state) => state.selectedModelId);
  const selectedThinkingLevel = useChatPaneFooterStore((state) => state.selectedThinkingLevel);
  const selectedThinkingProfile = useChatPaneFooterStore((state) => state.selectedThinkingProfile);
  const disabled = useChatPaneFooterStore((state) => state.disabled);
  const tokenUsage = useChatPaneFooterStore((state) => state.tokenUsage);
  const contextWindow = useChatPaneFooterStore((state) => state.contextWindow);
  const mode = useChatPaneFooterStore((state) => state.mode);
  const activeSessionId = useChatPaneFooterStore((state) => state.activeSessionId);
  const selectedSkillName = useChatPaneFooterStore((state) => state.selectedSkillName);
  const onSubmit = useChatPaneFooterStore((state) => state.onSubmit);
  const onStop = useChatPaneFooterStore((state) => state.onStop);
  const onInputError = useChatPaneFooterStore((state) => state.onInputError);
  const onOpenSettings = useChatPaneFooterStore((state) => state.onOpenSettings);
  const onSelectModel = useChatPaneFooterStore((state) => state.onSelectModel);
  const onSelectThinkingLevel = useChatPaneFooterStore((state) => state.onSelectThinkingLevel);
  const onModeChange = useChatPaneFooterStore((state) => state.onModeChange);
  const onSelectSkillName = useChatPaneFooterStore((state) => state.onSelectSkillName);
  const isSessionRunning = status === 'submitted' || status === 'streaming';

  return (
    <CardFooter className="relative shrink-0 flex-col items-stretch gap-2 p-3">
      <div className="relative">
        <div className="absolute bottom-full left-0 right-0 mb-3">
          <TaskHoverPanel activeSessionId={activeSessionId} isSessionRunning={isSessionRunning} />
        </div>
        <ChatPromptInput
          status={status}
          onSubmit={onSubmit}
          onStop={onStop}
          onError={(issue) => onInputError(issue.message)}
          activeFilePath={activeFilePath}
          activeFileContent={activeFileContent}
          vaultPath={vaultPath}
          modelGroups={modelGroups}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
          selectedThinkingLevel={selectedThinkingLevel}
          selectedThinkingProfile={selectedThinkingProfile}
          onSelectThinkingLevel={onSelectThinkingLevel}
          disabled={disabled}
          onOpenSettings={onOpenSettings}
          tokenUsage={tokenUsage}
          contextWindow={contextWindow}
          mode={mode}
          onModeChange={onModeChange}
          selectedSkillName={selectedSkillName}
          onSelectSkillName={onSelectSkillName}
        />
      </div>
      {inputError && <p className="px-1 text-xs text-destructive">{inputError}</p>}
    </CardFooter>
  );
};
