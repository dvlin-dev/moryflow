/**
 * [PROVIDES]: 首页区块顺序与 Compare section 数据配置
 * [DEPENDS]: None
 * [POS]: 首页冻结方案的单一事实源，供首页装配与测试复用
 */

export const HOME_SECTION_ORDER = [
  'hero',
  'trust-strip',
  'capabilities',
  'feature-local',
  'compare',
  'download-cta',
] as const;

/** All compare products for the /compare index page and homepage strip */
export const HOME_COMPARE_INDEX = [
  { id: 'openclaw', name: 'OpenClaw', descKey: 'home.compare.openclawDesc' },
  { id: 'cowork', name: 'Cowork', descKey: 'home.compare.coworkDesc' },
  { id: 'obsidian', name: 'Obsidian', descKey: 'home.compare.obsidianDesc' },
  { id: 'manus', name: 'Manus', descKey: 'home.compare.manusDesc' },
  { id: 'notion', name: 'Notion', descKey: 'home.compare.notionDesc' },
] as const;

// ─── Horizontal comparison grid data ───

export const HOME_COMPARE_FEATURES = [
  { key: 'memory', labelKey: 'home.compare.feat.memory' },
  { key: 'localFirst', labelKey: 'home.compare.feat.localFirst' },
  { key: 'multiProvider', labelKey: 'home.compare.feat.multiProvider' },
  { key: 'openSource', labelKey: 'home.compare.feat.openSource' },
  { key: 'publishing', labelKey: 'home.compare.feat.publishing' },
  { key: 'desktop', labelKey: 'home.compare.feat.desktop' },
  { key: 'agents', labelKey: 'home.compare.feat.agents' },
  { key: 'remoteAgent', labelKey: 'home.compare.feat.remoteAgent' },
  { key: 'freeToStart', labelKey: 'home.compare.feat.freeToStart' },
] as const;

export type FeatureKey = (typeof HOME_COMPARE_FEATURES)[number]['key'];
export type FeatureValue = true | false | string;

export interface CompareProduct {
  id: string;
  name: string;
  isSelf: boolean;
  compareHref: string | null;
  values: Record<FeatureKey, FeatureValue>;
}

export const HOME_COMPARE_PRODUCTS: CompareProduct[] = [
  {
    id: 'moryflow',
    name: 'Moryflow',
    isSelf: true,
    compareHref: null,
    values: {
      memory: true,
      localFirst: true,
      multiProvider: true,
      openSource: true,
      publishing: true,
      desktop: true,
      agents: true,
      remoteAgent: true,
      freeToStart: true,
    },
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    isSelf: false,
    compareHref: '/compare/openclaw',
    values: {
      memory: true,
      localFirst: 'home.compare.val.selfHosted',
      multiProvider: true,
      openSource: true,
      publishing: false,
      desktop: false,
      agents: true,
      remoteAgent: true,
      freeToStart: true,
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    isSelf: false,
    compareHref: '/compare/obsidian',
    values: {
      memory: false,
      localFirst: true,
      multiProvider: 'home.compare.val.viaPlugins',
      openSource: false,
      publishing: 'home.compare.val.paidAddon',
      desktop: true,
      agents: false,
      remoteAgent: false,
      freeToStart: true,
    },
  },
  {
    id: 'cowork',
    name: 'Claude Cowork',
    isSelf: false,
    compareHref: '/compare/cowork',
    values: {
      memory: 'home.compare.val.partial',
      localFirst: 'home.compare.val.partial',
      multiProvider: false,
      openSource: false,
      publishing: false,
      desktop: true,
      agents: true,
      remoteAgent: false,
      freeToStart: false,
    },
  },
  {
    id: 'manus',
    name: 'Manus',
    isSelf: false,
    compareHref: '/compare/manus',
    values: {
      memory: 'home.compare.val.partial',
      localFirst: false,
      multiProvider: false,
      openSource: false,
      publishing: true,
      desktop: 'home.compare.val.webWrapper',
      agents: true,
      remoteAgent: true,
      freeToStart: true,
    },
  },
  {
    id: 'notion',
    name: 'Notion',
    isSelf: false,
    compareHref: '/compare/notion',
    values: {
      memory: 'home.compare.val.partial',
      localFirst: false,
      multiProvider: false,
      openSource: false,
      publishing: true,
      desktop: false,
      agents: true,
      remoteAgent: false,
      freeToStart: true,
    },
  },
];
