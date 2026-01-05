/**
 * Site Publish IPC Types
 * 站点发布相关的 IPC 类型定义
 */

// ── 站点类型 ────────────────────────────────────────────────

export type SiteType = 'MARKDOWN' | 'GENERATED'
export type SiteStatus = 'ACTIVE' | 'OFFLINE' | 'DELETED'

/** 站点信息 */
export interface Site {
  id: string
  subdomain: string
  type: SiteType
  status: SiteStatus
  title: string | null
  description: string | null
  favicon: string | null
  showWatermark: boolean
  publishedAt: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  url: string
  pageCount: number
}

// ── 发布相关类型 ────────────────────────────────────────────

/** 发布文件 */
export interface PublishFile {
  path: string
  content: string // Base64 编码
  contentType: string
}

/** 发布页面信息 */
export interface PublishPage {
  path: string
  title?: string
  localFilePath?: string
  localFileHash?: string
}

/** 导航项 */
export interface NavItem {
  title: string
  path?: string
  children?: NavItem[]
}

/** 发布输入 */
export interface PublishSiteInput {
  siteId: string
  files: PublishFile[]
  pages?: PublishPage[]
  navigation?: NavItem[]
}

/** 发布结果 */
export interface PublishResult {
  siteId: string
  url: string
  publishedAt: Date
  pageCount: number
}

// ── 本地构建相关 ────────────────────────────────────────────

/** 构建输入（选择的文件/文件夹） */
export interface BuildSiteInput {
  /** 源文件路径列表（绝对路径） */
  sourcePaths: string[]
  /** 站点类型 */
  type: SiteType
  /** 站点 ID（更新现有站点时提供） */
  siteId?: string
  /** 子域名（创建新站点时提供） */
  subdomain?: string
  /** 站点标题 */
  title?: string
  /** 站点描述 */
  description?: string
}

/** 构建进度事件 */
export interface BuildProgressEvent {
  phase: 'scanning' | 'rendering' | 'uploading' | 'done' | 'error'
  current: number
  total: number
  message: string
  error?: string
}

/** 构建结果 */
export interface BuildSiteResult {
  success: boolean
  site?: Site
  error?: string
}

// ── 子域名相关 ────────────────────────────────────────────

/** 子域名检查结果 */
export interface SubdomainCheckResult {
  available: boolean
  subdomain: string
  message?: string
}

/** 子域名推荐结果 */
export interface SubdomainSuggestResult {
  suggestions: string[]
}

// ── 站点管理 ────────────────────────────────────────────────

/** 创建站点输入 */
export interface CreateSiteInput {
  subdomain: string
  type: SiteType
  title?: string
  description?: string
}

/** 更新站点输入 */
export interface UpdateSiteInput {
  siteId: string
  title?: string
  description?: string
  showWatermark?: boolean
}

// ── 本地站点存储 ────────────────────────────────────────────

/** 本地站点关联信息（存储在 vault 设置中） */
export interface LocalSiteBinding {
  siteId: string
  subdomain: string
  sourcePaths: string[] // 关联的本地文件路径
  lastPublishedAt?: string
  lastFileHashes?: Record<string, string> // path -> hash
}
