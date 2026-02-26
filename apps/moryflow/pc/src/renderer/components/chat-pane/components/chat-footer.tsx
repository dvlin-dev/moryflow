/**
 * [PROPS]: 无（通过 chat-pane-footer-store selector 取数）
 * [EMITS]: onSubmit/onStop/onInputError/onOpenSettings/onModeChange
 * [POS]: ChatPane 底部区域（任务悬浮条 + 输入框 + 错误提示）
 * [UPDATE]: 2026-02-02 - 对齐悬浮任务面板宽度与垂直间距
 * [UPDATE]: 2026-02-03 - 仅在会话运行时触发任务面板展示
 * [UPDATE]: 2026-02-11 - 透传 selectedSkill 到输入框，支持显式 skill 注入
 * [UPDATE]: 2026-02-26 - 改为就地读取 chat-pane-footer-store，移除上层 props 平铺
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { CardFooter } from '@moryflow/ui/components/card';

import { ChatPromptInput } from './chat-prompt-input';
import { TaskHoverPanel } from './task-hover-panel';
import { useChatPaneFooterStore } from '../hooks/use-chat-pane-footer-store';

export const ChatFooter = () => {
  const {
    status,
    inputError,
    activeFilePath,
    activeFileContent,
    vaultPath,
    modelGroups,
    selectedModelId,
    disabled,
    tokenUsage,
    contextWindow,
    mode,
    activeSessionId,
    selectedSkillName,
    onSubmit,
    onStop,
    onInputError,
    onOpenSettings,
    onSelectModel,
    onModeChange,
    onSelectSkillName,
  } = useChatPaneFooterStore(
    (state) => ({
      status: state.status,
      inputError: state.inputError,
      activeFilePath: state.activeFilePath,
      activeFileContent: state.activeFileContent,
      vaultPath: state.vaultPath,
      modelGroups: state.modelGroups,
      selectedModelId: state.selectedModelId,
      disabled: state.disabled,
      tokenUsage: state.tokenUsage,
      contextWindow: state.contextWindow,
      mode: state.mode,
      activeSessionId: state.activeSessionId,
      selectedSkillName: state.selectedSkillName,
      onSubmit: state.onSubmit,
      onStop: state.onStop,
      onInputError: state.onInputError,
      onOpenSettings: state.onOpenSettings,
      onSelectModel: state.onSelectModel,
      onModeChange: state.onModeChange,
      onSelectSkillName: state.onSelectSkillName,
    })
  );
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
