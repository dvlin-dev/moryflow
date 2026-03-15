/**
 * [PROVIDES]: 侧边栏渲染
 * [POS]: 生成多页面布局的侧边栏 HTML
 */

import type { NavItem } from '../../../shared/ipc/site-publish.js';
import { escapeHtml } from './template.js';

/** 生成侧边栏 HTML（多页面布局） */
export function renderSidebar(
  siteTitle: string,
  navigation?: NavItem[],
  currentPath?: string
): string {
  if (!navigation || navigation.length === 0) {
    return '';
  }

  const renderItem = (item: NavItem): string => {
    const isActive = item.path === currentPath;
    const activeClass = isActive ? ' active' : '';

    if (item.children && item.children.length > 0) {
      const childrenHtml = item.children.map((child) => renderItem(child)).join('');
      return `
        <li class="nav-group">
          <button type="button" class="nav-group-toggle">
            ${escapeHtml(item.title)}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <ul class="nav-group-children">${childrenHtml}</ul>
        </li>`;
    }

    return `<li class="nav-item${activeClass}"><a href="${item.path || '#'}">${escapeHtml(item.title)}</a></li>`;
  };

  const itemsHtml = navigation.map((item) => renderItem(item)).join('');

  return `
  <aside class="sidebar">
    <div class="sidebar-header">
      <a href="/" class="site-title">${escapeHtml(siteTitle)}</a>
    </div>
    <nav>
      <ul class="nav-list">${itemsHtml}</ul>
    </nav>
  </aside>`;
}
