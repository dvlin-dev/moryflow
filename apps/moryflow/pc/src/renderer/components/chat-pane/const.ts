import type { SettingsSection } from '@/components/settings-dialog/const';

export const MAX_CONTEXT_CHARS = 32 * 1024;

export type OpenTab = {
  id: string;
  name: string;
  path: string;
  pinned?: boolean;
};

export type ChatPaneProps = {
  /**
   * 渲染形态：
   * - `panel`: 右侧 Assistant Panel（含折叠按钮 + 历史入口）
   * - `mode`: Chat Mode 主视图（不展示折叠按钮，避免语义不一致）
   */
  variant?: 'panel' | 'mode';
  activeFilePath?: string | null;
  activeFileContent?: string | null;
  vaultPath?: string | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenSettings?: (section?: SettingsSection) => void;
};

export type ApprovalDecision = 'approved' | 'rejected';
