/**
 * [PROPS]: ChatComposerProps - 共享输入区布局配置
 * [EMITS]: 通过 chat runtime context 触发输入相关动作
 * [POS]: ChatPane 共享 composer（正式对话页 / prethread 页）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import type { ChatPromptSuggestion } from './chat-prompt-input/const';
import { ChatPromptInput } from './chat-prompt-input';
import { cn } from '@/lib/utils';
import { useChatPaneRuntime } from '../context/chat-pane-runtime-context';

type ChatComposerProps = {
  variant?: 'default' | 'prethread';
  submitMode?: 'default' | 'new-thread';
  suggestions?: ChatPromptSuggestion[];
  className?: string;
};

export const ChatComposer = ({
  variant = 'default',
  submitMode = 'default',
  suggestions = [],
  className,
}: ChatComposerProps) => {
  const { composer } = useChatPaneRuntime();

  return (
    <div className={cn('w-full', className)}>
      <ChatPromptInput
        status={composer.status}
        onSubmit={submitMode === 'new-thread' ? composer.onSubmitNewThread : composer.onSubmit}
        onStop={composer.onStop}
        onError={(issue) => composer.onInputError(issue.message)}
        activeFilePath={composer.activeFilePath}
        activeFileContent={composer.activeFileContent}
        vaultPath={composer.vaultPath}
        modelGroups={composer.modelGroups}
        selectedModelId={composer.selectedModelId}
        onSelectModel={composer.onSelectModel}
        selectedThinkingLevel={composer.selectedThinkingLevel}
        selectedThinkingProfile={composer.selectedThinkingProfile}
        onSelectThinkingLevel={composer.onSelectThinkingLevel}
        disabled={composer.disabled}
        onOpenSettings={composer.onOpenSettings}
        tokenUsage={composer.tokenUsage}
        contextWindow={composer.contextWindow}
        mode={composer.mode}
        onModeChange={composer.onModeChange}
        selectedSkillName={composer.selectedSkillName}
        onSelectSkillName={composer.onSelectSkillName}
        variant={variant}
        suggestions={suggestions}
      />
      {composer.inputError ? (
        <p className="px-1 pt-2 text-xs text-destructive">{composer.inputError}</p>
      ) : null}
    </div>
  );
};
