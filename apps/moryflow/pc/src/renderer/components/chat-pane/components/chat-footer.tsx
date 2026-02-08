/**
 * [PROPS]: ChatFooterProps - 输入框/任务悬浮条/错误提示
 * [EMITS]: onSubmit/onStop/onInputError/onOpenSettings/onModeChange
 * [POS]: ChatPane 底部区域（任务悬浮条 + 输入框 + 错误提示）
 * [UPDATE]: 2026-02-02 - 对齐悬浮任务面板宽度与垂直间距
 * [UPDATE]: 2026-02-03 - 仅在会话运行时触发任务面板展示
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { ChatStatus } from 'ai';

import { CardFooter } from '@anyhunt/ui/components/card';
import type { SettingsSection } from '@/components/settings-dialog/const';
import type { TokenUsage, ChatSessionSummary } from '@shared/ipc';

import { ChatPromptInput } from './chat-prompt-input';
import { TaskHoverPanel } from './task-hover-panel';
import type { ChatSubmitPayload } from './chat-prompt-input/const';
import type { ModelGroup } from '../models';

type Props = {
  status: ChatStatus;
  inputError: string | null;
  onSubmit: (payload: ChatSubmitPayload) => Promise<void>;
  onStop: () => void;
  onInputError: (message: string) => void;
  onOpenSettings?: (section?: SettingsSection) => void;
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  vaultPath?: string | null;
  modelGroups: ModelGroup[];
  selectedModelId?: string | null;
  onSelectModel: (id: string) => void;
  disabled: boolean;
  tokenUsage?: TokenUsage | null;
  contextWindow?: number;
  mode: ChatSessionSummary['mode'];
  onModeChange: (mode: ChatSessionSummary['mode']) => void;
  activeSessionId: string | null;
};

export const ChatFooter = ({
  status,
  inputError,
  onSubmit,
  onStop,
  onInputError,
  onOpenSettings,
  activeFilePath,
  activeFileContent,
  vaultPath,
  modelGroups,
  selectedModelId,
  onSelectModel,
  disabled,
  tokenUsage,
  contextWindow,
  mode,
  onModeChange,
  activeSessionId,
}: Props) => {
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
        />
      </div>
      {inputError && <p className="px-1 text-xs text-destructive">{inputError}</p>}
    </CardFooter>
  );
};
