/**
 * [PROVIDES]: 首页区块顺序与中段能力区块的数据配置
 * [DEPENDS]: None
 * [POS]: 首页冻结方案的单一事实源，供首页装配与测试复用
 */

export const HOME_SECTION_ORDER = [
  'hero',
  'pillars',
  'workflow',
  'use-cases',
  'telegram',
  'compare',
  'publishing',
  'social-proof',
  'download-cta',
] as const;

export const HOME_COMPARE_PAGE_IDS = ['notion', 'obsidian', 'openclaw'] as const;

export interface HomeCompareCard {
  pageId: (typeof HOME_COMPARE_PAGE_IDS)[number];
  label: string;
  titleKey: string;
  descKey: string;
  fitKey: string;
}

export const HOME_COMPARE_CARDS: HomeCompareCard[] = [
  {
    pageId: 'notion',
    label: 'Notion',
    titleKey: 'home.compare.notionTitle',
    descKey: 'home.compare.notionDesc',
    fitKey: 'home.compare.notionFit',
  },
  {
    pageId: 'obsidian',
    label: 'Obsidian',
    titleKey: 'home.compare.obsidianTitle',
    descKey: 'home.compare.obsidianDesc',
    fitKey: 'home.compare.obsidianFit',
  },
  {
    pageId: 'openclaw',
    label: 'OpenClaw',
    titleKey: 'home.compare.openclawTitle',
    descKey: 'home.compare.openclawDesc',
    fitKey: 'home.compare.openclawFit',
  },
];

export const HOME_TELEGRAM_POINT_KEYS = [
  'home.telegram.pointChat',
  'home.telegram.pointGrounded',
  'home.telegram.pointCapture',
] as const;
