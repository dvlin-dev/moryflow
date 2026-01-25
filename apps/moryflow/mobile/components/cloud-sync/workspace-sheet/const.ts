/**
 * [DEFINES]: WorkspaceSheet 类型定义与常量
 * [USED_BY]: workspace-sheet 目录下所有组件
 * [POS]: 集中管理类型定义，避免循环依赖
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { ManagedVault } from '@/lib/vault';
import type { useThemeColors } from '@/lib/theme';
import type { AppIcon } from '@/components/ui/icons';

// ── Props 类型 ───────────────────────────────────────────────────

export interface WorkspaceSheetProps {
  visible: boolean;
  onClose: () => void;
  vaultName?: string;
  onSyncPress?: () => void;
}

export interface VaultItemProps {
  vault: ManagedVault;
  isCurrent: boolean;
  isOperating: boolean;
  onSwitch: () => void;
  onRename: () => void;
  onDelete: () => void;
  colors: ThemeColors;
  isDark: boolean;
}

export interface ActionButtonProps {
  icon: AppIcon;
  iconColor: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  colors: ThemeColors;
  isDark: boolean;
}

export interface SyncStatusProps {
  isSyncing: boolean;
  statusInfo: StatusInfo;
  lastSyncText: string;
  colors: ThemeColors;
}

export interface SeparatorProps {
  isDark: boolean;
  indent?: number;
}

// ── 内部类型 ─────────────────────────────────────────────────────

export type ThemeColors = ReturnType<typeof useThemeColors>;

export interface StatusInfo {
  text: string;
  icon: AppIcon;
  color: string;
}

// ── 常量 ─────────────────────────────────────────────────────────

export const SHEET_SNAP_POINTS: (string | number)[] = ['55%'];

export const SHEET_STYLES = {
  handleIndicatorWidth: 36,
  borderRadius: 20,
  contentPaddingHorizontal: 16,
  contentPaddingBottom: 32,
  cardBorderRadius: 12,
  itemPadding: 16,
} as const;

export const PRESSED_BACKGROUND = {
  dark: 'rgba(255,255,255,0.08)',
  light: 'rgba(0,0,0,0.05)',
} as const;

export const CARD_BACKGROUND = {
  dark: 'rgba(255,255,255,0.05)',
  light: 'rgba(0,0,0,0.03)',
} as const;
