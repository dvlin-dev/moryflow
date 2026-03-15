/**
 * [PROVIDES]: 特殊页面生成
 * [DEPENDS]: template/
 * [POS]: 生成目录页和 404 页面
 */

import {
  INDEX_PAGE_TEMPLATE,
  INDEX_PAGE_STYLES,
  ERROR_404_TEMPLATE,
  ERROR_404_STYLES,
  STYLES,
  THEME_INIT_SCRIPT,
  THEME_TOGGLE_SCRIPT,
} from '../template/index.js';
import { escapeHtml } from '../renderer/template.js';
import type { NavItem, PublishPage } from './const.js';

/** 页面图标 */
const PAGE_ICON = '📋';

/** 生成目录页（当没有 index.md 时自动生成） */
export function generateIndexPage(
  siteTitle: string,
  pages: PublishPage[],
  navigation: NavItem[],
  options: { lang: string; description: string }
): string {
  const safeLang = escapeHtml(options.lang);
  const safeDescription = escapeHtml(options.description);
  const safeSiteTitle = escapeHtml(siteTitle);
  // 生成单独的 Bento 卡片 HTML（顶层页面）
  const renderBentoCard = (
    title: string,
    path: string,
    featured = false,
    description?: string
  ): string => {
    const featuredClass = featured ? ' featured' : '';
    const safeTitle = escapeHtml(title);
    const safePath = escapeHtml(path);
    const descHtml = description
      ? `\n          <p class="bento-description">${escapeHtml(description)}</p>`
      : '';
    return `        <a href="${safePath}" class="bento-card${featuredClass}">
          <div class="bento-icon">${PAGE_ICON}</div>
          <h3 class="bento-title">${safeTitle}</h3>${descHtml}
        </a>`;
  };

  // 生成分组卡片 HTML（瀑布流中的一个卡片，内含子项列表）
  const renderGroupCard = (group: NavItem): string => {
    const safeGroupTitle = escapeHtml(group.title);
    const childItems = group
      .children!.filter((child) => child.path)
      .map((child) => {
        const safeTitle = escapeHtml(child.title);
        const safePath = escapeHtml(child.path!);
        return `            <li class="bento-group-item">
              <a href="${safePath}">
                <span class="item-icon">${PAGE_ICON}</span>
                <span class="item-title">${safeTitle}</span>
              </a>
            </li>`;
      })
      .join('\n');

    return `        <div class="bento-group">
          <h2 class="bento-group-title">${safeGroupTitle}</h2>
          <ul class="bento-group-list">
${childItems}
          </ul>
        </div>`;
  };

  // 生成导航卡片 HTML（支持分组，瀑布流布局）
  const renderNavCards = (items: NavItem[]): string => {
    // 分离分组和普通页面
    const groups = items.filter((item) => item.children && item.children.length > 0);
    const topLevelPages = items.filter(
      (item) => item.path && (!item.children || item.children.length === 0)
    );

    const result: string[] = [];

    // 渲染普通页面（第一个可以是 featured）
    topLevelPages.forEach((item, index) => {
      result.push(renderBentoCard(item.title, item.path!, index === 0 && topLevelPages.length > 1));
    });

    // 渲染分组卡片（每个分组是一个卡片）
    groups.forEach((group) => {
      result.push(renderGroupCard(group));
    });

    return result.join('\n');
  };

  // 如果有导航结构就用导航，否则用 pages 列表
  let navHtml: string;
  if (navigation.length > 0) {
    navHtml = renderNavCards(navigation);
  } else {
    navHtml = pages
      .map((p, i) => renderBentoCard(p.title || p.path, p.path, i === 0 && pages.length > 1))
      .join('\n');
  }

  const siteDescriptionHtml = options.description
    ? `<p class="index-description">${escapeHtml(options.description)}</p>`
    : '';

  // 填充模板
  return INDEX_PAGE_TEMPLATE.replace('{{STYLES}}', STYLES)
    .replace('{{INDEX_PAGE_STYLES}}', INDEX_PAGE_STYLES)
    .replace('{{THEME_INIT_SCRIPT}}', THEME_INIT_SCRIPT)
    .replace('{{THEME_TOGGLE_SCRIPT}}', THEME_TOGGLE_SCRIPT)
    .replace(/\{\{lang\}\}/g, safeLang)
    .replace(/\{\{description\}\}/g, safeDescription)
    .replace(/\{\{siteTitle\}\}/g, safeSiteTitle)
    .replace('{{navItems}}', navHtml)
    .replace('{{siteDescription}}', siteDescriptionHtml);
}

/** 生成 404 页面 */
export function generate404Page(
  siteTitle: string,
  options: { lang: string; description: string }
): string {
  const safeLang = escapeHtml(options.lang);
  const safeDescription = escapeHtml(options.description);
  const safeSiteTitle = escapeHtml(siteTitle);
  return ERROR_404_TEMPLATE.replace('{{STYLES}}', STYLES)
    .replace('{{ERROR_PAGE_STYLES}}', ERROR_404_STYLES)
    .replace('{{THEME_INIT_SCRIPT}}', THEME_INIT_SCRIPT)
    .replace(/\{\{lang\}\}/g, safeLang)
    .replace(/\{\{description\}\}/g, safeDescription)
    .replace(/\{\{siteTitle\}\}/g, safeSiteTitle);
}
