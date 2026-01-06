/**
 * [PROVIDES]: 侧边栏渲染
 * [POS]: 生成多页面布局的侧边栏 HTML
 */

import type { NavItem } from '../../../shared/ipc/site-publish.js'
import { escapeHtml } from './template.js'

/** 生成侧边栏 HTML（多页面布局） */
export function renderSidebar(
  siteTitle: string,
  navigation?: NavItem[],
  currentPath?: string,
): string {
  if (!navigation || navigation.length === 0) {
    return ''
  }

  const renderItem = (item: NavItem): string => {
    const isActive = item.path === currentPath
    const activeClass = isActive ? ' active' : ''

    if (item.children && item.children.length > 0) {
      const childrenHtml = item.children.map((child) => renderItem(child)).join('')
      return `
        <li class="nav-item">
          <span class="nav-group-title">${escapeHtml(item.title)}</span>
          <ul class="nav-group-children">${childrenHtml}</ul>
        </li>`
    }

    return `<li class="nav-item${activeClass}"><a href="${item.path || '#'}">${escapeHtml(item.title)}</a></li>`
  }

  const itemsHtml = navigation.map((item) => renderItem(item)).join('')

  return `
  <aside class="sidebar">
    <div class="sidebar-header">
      <a href="/" class="site-title">${escapeHtml(siteTitle)}</a>
    </div>
    <nav>
      <ul class="nav-list">${itemsHtml}</ul>
    </nav>
  </aside>`
}
