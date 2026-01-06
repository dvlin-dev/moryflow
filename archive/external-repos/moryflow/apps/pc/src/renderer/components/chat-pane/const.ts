export const MAX_CONTEXT_CHARS = 32 * 1024

export type OpenTab = {
  id: string
  name: string
  path: string
  pinned?: boolean
}

import type { SettingsSection } from '@/components/settings-dialog/const'

export type ChatPaneProps = {
  activeFilePath?: string | null
  activeFileContent?: string | null
  vaultPath?: string | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onOpenSettings?: (section?: SettingsSection) => void
}

export type ApprovalDecision = 'approved' | 'rejected'
