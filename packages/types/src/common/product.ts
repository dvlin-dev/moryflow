/**
 * [DEFINES]: 产品标识类型
 * [USED_BY]: 所有产品
 * [POS]: 跨业务线共享类型（不代表账号/数据互通）
 */

export const ProductId = {
  ANYHUNT_DEV: 'anyhunt-dev',
  MORYFLOW: 'moryflow',
  FETCHX: 'fetchx',
  MEMOX: 'memox',
  SANDX: 'sandx',
} as const;

export type ProductId = (typeof ProductId)[keyof typeof ProductId];

export interface ProductInfo {
  id: ProductId;
  name: string;
  description: string;
  websiteBaseUrl: string;
  websitePath: string;
  apiBaseUrl: string;
  apiKeyPrefix: string;
}

export const PRODUCT_INFOS: Record<ProductId, ProductInfo> = {
  [ProductId.ANYHUNT_DEV]: {
    id: ProductId.ANYHUNT_DEV,
    name: 'Anyhunt Dev',
    description: 'Developer platform for AI agents (Fetchx, Memox, ...)',
    websiteBaseUrl: 'https://anyhunt.app',
    websitePath: '/',
    apiBaseUrl: 'https://server.anyhunt.app/api/v1',
    apiKeyPrefix: 'ah_',
  },
  [ProductId.MORYFLOW]: {
    id: ProductId.MORYFLOW,
    name: 'Moryflow',
    description: 'Note-based AI workflow with website publishing',
    websiteBaseUrl: 'https://www.moryflow.com',
    websitePath: '/',
    apiBaseUrl: 'https://app.moryflow.com/api/v1',
    apiKeyPrefix: 'mf_',
  },
  [ProductId.FETCHX]: {
    id: ProductId.FETCHX,
    name: 'Fetchx',
    description: 'Web data API (scrape, crawl, extract)',
    websiteBaseUrl: 'https://anyhunt.app',
    websitePath: '/fetchx',
    apiBaseUrl: 'https://server.anyhunt.app/api/v1',
    apiKeyPrefix: 'ah_',
  },
  [ProductId.MEMOX]: {
    id: ProductId.MEMOX,
    name: 'Memox',
    description: 'AI memory API for long-term memory',
    websiteBaseUrl: 'https://anyhunt.app',
    websitePath: '/memox',
    apiBaseUrl: 'https://server.anyhunt.app/api/v1',
    apiKeyPrefix: 'ah_',
  },
  [ProductId.SANDX]: {
    id: ProductId.SANDX,
    name: 'Sandx',
    description: 'Agent sandbox for secure code execution',
    websiteBaseUrl: 'https://anyhunt.app',
    websitePath: '/sandx',
    apiBaseUrl: 'https://server.anyhunt.app/api/v1',
    apiKeyPrefix: 'ah_',
  },
};
