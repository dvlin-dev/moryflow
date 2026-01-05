/**
 * [DEFINES]: 站点构建器类型和常量
 * [POS]: 构建流程中使用的核心类型定义
 */

import type {
  PublishFile,
  PublishPage,
  NavItem,
  BuildProgressEvent,
} from '../../../shared/ipc/site-publish.js'

// 支持的文件扩展名
export const SUPPORTED_EXTENSIONS = ['.md', '.markdown']

// 文件信息
export interface FileInfo {
  absolutePath: string
  relativePath: string
  name: string
  isDirectory: boolean
}

// 页面信息
export interface PageInfo {
  sourcePath: string
  outputPath: string
  title: string
  route: string
}

// 构建结果
export interface BuildResult {
  files: PublishFile[]
  pages: PublishPage[]
  navigation: NavItem[]
}

// 构建选项
export interface BuildOptions {
  siteTitle?: string
  onProgress?: (event: BuildProgressEvent) => void
}

// 导出共享类型
export type { PublishFile, PublishPage, NavItem, BuildProgressEvent }
