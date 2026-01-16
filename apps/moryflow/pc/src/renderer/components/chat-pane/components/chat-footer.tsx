import type { ChatStatus } from 'ai'

import { CardFooter } from '@anyhunt/ui/components/card'
import type { SettingsSection } from '@/components/settings-dialog/const'
import type { PlanSnapshot, TokenUsage } from '@shared/ipc'

import { ChatPromptInput } from './chat-prompt-input'
import type { ChatSubmitPayload } from './chat-prompt-input/const'
import type { ModelGroup } from '../models'

type Props = {
  status: ChatStatus
  inputError: string | null
  onSubmit: (payload: ChatSubmitPayload) => Promise<void>
  onStop: () => void
  onInputError: (message: string) => void
  onOpenSettings?: (section?: SettingsSection) => void
  activeFilePath?: string | null
  activeFileContent?: string | null
  vaultPath?: string | null
  modelGroups: ModelGroup[]
  selectedModelId?: string | null
  onSelectModel: (id: string) => void
  disabled: boolean
  todoSnapshot: PlanSnapshot | null
  tokenUsage?: TokenUsage | null
  contextWindow?: number
}

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
  todoSnapshot,
  tokenUsage,
  contextWindow,
}: Props) => (
  <CardFooter className="shrink-0 flex-col items-stretch gap-2 p-3">
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
      todoSnapshot={todoSnapshot}
      tokenUsage={tokenUsage}
      contextWindow={contextWindow}
    />
    {inputError && <p className="px-1 text-xs text-destructive">{inputError}</p>}
  </CardFooter>
)
