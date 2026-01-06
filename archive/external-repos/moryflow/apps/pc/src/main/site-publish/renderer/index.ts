/**
 * [PROVIDES]: Markdown 渲染器核心功能
 * [DEPENDS]: marked, template/, frontmatter.ts, sidebar.ts
 * [POS]: 将 Markdown 转换为 HTML 页面
 */

import { marked } from 'marked'
import * as fs from 'fs/promises'
import * as path from 'path'
import type { NavItem } from '../../../shared/ipc/site-publish.js'
import {
  PAGE_TEMPLATE,
  STYLES,
  THEME_INIT_SCRIPT,
  THEME_TOGGLE_SCRIPT,
  MENU_TOGGLE_SCRIPT,
  escapeHtml,
} from './template.js'
import { parseFrontmatter } from './frontmatter.js'
import { renderSidebar } from './sidebar.js'

// 导出子模块
export { parseFrontmatter } from './frontmatter.js'
export { extractLocalImages, replaceImagePaths } from './image.js'
export { escapeHtml } from './template.js'

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
})

export interface RenderOptions {
  title?: string
  description?: string
  favicon?: string
  siteTitle?: string
  navigation?: NavItem[]
  currentPath?: string
}

/** 渲染 Markdown 为完整 HTML 页面 */
export async function renderMarkdownToHtml(
  markdown: string,
  options: RenderOptions = {},
): Promise<string> {
  // 解析 frontmatter
  const { frontmatter, body } = parseFrontmatter(markdown)

  // 确定标题
  const title = options.title || frontmatter.title || '无标题'
  const pageTitle = title
  const siteTitle = options.siteTitle || title
  const description = options.description || frontmatter.description || ''
  const favicon = options.favicon || '/favicon.ico'
  const lang = frontmatter.lang || 'zh-CN'

  // 渲染 Markdown
  const htmlContent = await marked.parse(body)

  // 判断布局类型
  const hasMultiplePages = options.navigation && options.navigation.length > 0
  const sidebarHtml = hasMultiplePages
    ? renderSidebar(siteTitle, options.navigation, options.currentPath)
    : ''
  const bodyClass = sidebarHtml ? 'has-sidebar' : ''
  const layoutClass = sidebarHtml ? 'main-area' : 'layout-single'

  // 填充模板（先注入样式和脚本，再填充页面变量）
  const html = PAGE_TEMPLATE
    // 注入样式和脚本
    .replace('{{STYLES}}', STYLES)
    .replace('{{THEME_INIT_SCRIPT}}', THEME_INIT_SCRIPT)
    .replace('{{THEME_TOGGLE_SCRIPT}}', THEME_TOGGLE_SCRIPT)
    .replace('{{MENU_TOGGLE_SCRIPT}}', MENU_TOGGLE_SCRIPT)
    // 填充页面变量
    .replace(/\{\{lang\}\}/g, escapeHtml(lang))
    .replace(/\{\{title\}\}/g, escapeHtml(title))
    .replace(/\{\{pageTitle\}\}/g, escapeHtml(pageTitle))
    .replace(/\{\{siteTitle\}\}/g, escapeHtml(siteTitle))
    .replace(/\{\{description\}\}/g, escapeHtml(description))
    .replace(/\{\{favicon\}\}/g, escapeHtml(favicon))
    .replace('{{sidebar}}', sidebarHtml)
    .replace('{{bodyClass}}', bodyClass)
    .replace('{{layoutClass}}', layoutClass)
    .replace('{{content}}', htmlContent)

  return html
}

export interface FileRenderOptions {
  content?: string
  siteTitle?: string
  navigation?: NavItem[]
  currentPath?: string
}

export interface FileRenderResult {
  html: string
  title: string
}

/**
 * 从文件路径渲染 HTML
 * @param filePath 文件路径（用于解析标题和 basePath）
 * @param options.content 可选，预处理后的内容（避免重复读取文件）
 */
export async function renderFileToHtml(
  filePath: string,
  options: FileRenderOptions = {},
): Promise<FileRenderResult> {
  const content = options.content ?? await fs.readFile(filePath, 'utf-8')

  // 解析 frontmatter 获取标题
  const { frontmatter } = parseFrontmatter(content)
  const title = frontmatter.title || path.basename(filePath, '.md')

  // 渲染 HTML
  const html = await renderMarkdownToHtml(content, {
    siteTitle: options.siteTitle,
    navigation: options.navigation,
    currentPath: options.currentPath,
    title,
  })

  return { html, title }
}
