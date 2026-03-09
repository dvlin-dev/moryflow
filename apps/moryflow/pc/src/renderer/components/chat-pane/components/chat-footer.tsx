/**
 * [PROPS]: 无（通过 chat-pane-footer-store selector 取数）
 * [EMITS]: onSubmit/onStop/onInputError/onOpenSettings/onModeChange
 * [POS]: ChatPane 底部区域（任务悬浮条 + 输入框 + 错误提示）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { CardFooter } from '@moryflow/ui/components/card';

import { ChatPromptInput } from './chat-prompt-input';
import { TaskHoverPanel } from './task-hover-panel';
import { useChatSessions } from '../hooks';
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
  const selectedSkillName = useChatPaneFooterStore((state) => state.selectedSkillName);
  const onSubmit = useChatPaneFooterStore((state) => state.onSubmit);
  const onStop = useChatPaneFooterStore((state) => state.onStop);
  const onInputError = useChatPaneFooterStore((state) => state.onInputError);
  const onOpenSettings = useChatPaneFooterStore((state) => state.onOpenSettings);
  const onSelectModel = useChatPaneFooterStore((state) => state.onSelectModel);
  const onSelectThinkingLevel = useChatPaneFooterStore((state) => state.onSelectThinkingLevel);
  const onModeChange = useChatPaneFooterStore((state) => state.onModeChange);
  const onSelectSkillName = useChatPaneFooterStore((state) => state.onSelectSkillName);
  const { activeSession } = useChatSessions();

  return (
    <CardFooter className="relative shrink-0 flex-col items-stretch gap-2 p-3">
      <div className="relative">
        <div className="absolute bottom-full left-0 right-0 mb-3">
          <TaskHoverPanel taskState={activeSession?.taskState} />
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
