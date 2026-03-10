/**
 * [PROVIDES]: 首页区块顺序与 Compare section 数据配置
 * [DEPENDS]: None
 * [POS]: 首页冻结方案的单一事实源，供首页装配与测试复用
 */

export const HOME_SECTION_ORDER = ['hero', 'features', 'compare', 'download-cta'] as const;

/** Compare cards shown on homepage (Top 3 by traffic) */
export const HOME_COMPARE_CARDS = [
  { pageId: 'openclaw', label: 'OpenClaw', descKey: 'home.compare.openclawDesc' },
  { pageId: 'cowork', label: 'Cowork', descKey: 'home.compare.coworkDesc' },
  { pageId: 'obsidian', label: 'Obsidian', descKey: 'home.compare.obsidianDesc' },
] as const;

/** Additional compare pages linked at bottom of Compare section */
export const HOME_COMPARE_MORE = [
  { pageId: 'manus', label: 'Manus' },
  { pageId: 'notion', label: 'Notion' },
] as const;
