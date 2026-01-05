/**
 * [DEFINES]: Share 组件相关类型定义
 * [USED_BY]: SharePopover, PublishPanel, SiteSettingsPanel
 * [POS]: Share 组件目录的类型和常量中心
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import type { Site, BuildProgressEvent } from '../../../shared/ipc/site-publish'

// ── 面板类型 ─────────────────────────────────────────────────

/** Share Popover 内部面板类型 */
export type SharePanel = 'main' | 'publish' | 'settings'

// ── 子域名状态 ───────────────────────────────────────────────

/** 子域名检查状态 */
export type SubdomainStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

// ── 组件 Props ───────────────────────────────────────────────

/** SharePopover 组件 Props */
export interface SharePopoverProps {
  /** 当前文件路径 */
  filePath: string
  /** 文件标题（用于生成默认子域名） */
  fileTitle?: string
  /** 已发布站点信息（如果有） */
  publishedSite?: Site
  /** 发布成功回调 */
  onPublished?: (site: Site) => void
  /** 导航到 Sites 页面 */
  onNavigateToSites?: () => void
  /** 子节点（触发器） */
  children: React.ReactNode
}

/** SiteSettingsPanel 组件 Props */
export interface SiteSettingsPanelProps {
  /** 站点信息 */
  site: Site
  /** 返回上一面板 */
  onBack: () => void
  /** 设置变更回调 */
  onSettingsChange?: (settings: SiteSettings) => void
}

/** SubdomainInput 组件 Props */
export interface SubdomainInputProps {
  /** 子域名值 */
  value: string
  /** 值变更回调 */
  onChange: (value: string) => void
  /** 检查状态 */
  status: SubdomainStatus
  /** 状态消息 */
  message?: string
  /** 是否禁用 */
  disabled?: boolean
}

// ── 站点设置 ─────────────────────────────────────────────────

/** 站点设置（可编辑字段） */
export interface SiteSettings {
  title: string
  description: string
  showWatermark: boolean
}

// ── 工具函数 ─────────────────────────────────────────────────

/**
 * 从 Electron IPC 错误中提取实际错误消息
 * 移除 "Error invoking remote method 'xxx': Error:" 前缀
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback
  const match = err.message.match(/Error invoking remote method '[^']+': Error: (.+)/)
  return match ? match[1] : err.message
}

// ── Hook 状态 ─────────────────────────────────────────────────

/** SharePopover Hook 返回值 */
export interface UseSharePopoverReturn {
  // UI 状态
  panel: SharePanel
  setPanel: (panel: SharePanel) => void

  // 发布状态
  subdomain: string
  setSubdomain: (value: string) => void
  subdomainStatus: SubdomainStatus
  subdomainMessage?: string

  // 发布进度
  publishing: boolean
  progress: BuildProgressEvent | null

  // 已发布站点
  publishedSite: Site | null

  // 操作
  checkSubdomain: (value: string) => Promise<void>
  publish: (input: PublishInput) => Promise<Site>
  unpublish: () => Promise<void>
  updateSettings: (settings: Partial<SiteSettings>) => Promise<void>

  // 重置
  reset: () => void
}

/** 发布输入 */
export interface PublishInput {
  filePath: string
  subdomain: string
  title?: string
}

// ── 常量 ─────────────────────────────────────────────────────

/** 子域名后缀 */
export const SUBDOMAIN_SUFFIX = '.moryflow.app'

/** 子域名检查防抖时间（毫秒） */
export const SUBDOMAIN_CHECK_DEBOUNCE = 300

/** 子域名格式正则 */
export const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

/** 子域名最小长度 */
export const SUBDOMAIN_MIN_LENGTH = 3

/** 子域名最大长度 */
export const SUBDOMAIN_MAX_LENGTH = 63
