/**
 * [DEFINES]: Settings 通用类型定义
 * [USED_BY]: settings 目录下所有组件
 * [POS]: 集中管理类型定义，避免循环依赖
 */

import type { LucideIcon } from 'lucide-react-native'

// ── 类型定义 ────────────────────────────────────────────────────

export interface SettingsRowProps {
  icon?: LucideIcon
  iconColor?: string
  title: string
  subtitle?: string
  rightContent?: React.ReactNode
  onPress?: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
  showArrow?: boolean
}

export interface SettingsGroupProps {
  title?: string
  footer?: string
  children: React.ReactNode
}

export interface SectionHeaderProps {
  title: string
}

export interface SettingsSeparatorProps {
  /** 左侧缩进（默认 52 = icon 28 + padding 16 + gap 8） */
  indent?: number
}
