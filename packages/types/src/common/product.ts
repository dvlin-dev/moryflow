/**
 * [DEFINES]: 产品标识类型
 * [USED_BY]: 所有产品
 * [POS]: 跨业务线共享类型（不代表账号/数据互通）
 */

export const ProductId = {
  AIGET_DEV: 'aiget-dev',
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
  [ProductId.AIGET_DEV]: {
    id: ProductId.AIGET_DEV,
    name: 'Aiget Dev',
    description: 'Developer platform for AI agents (Fetchx, Memox, ...)',
    websiteBaseUrl: 'https://aiget.dev',
    websitePath: '/',
    apiBaseUrl: 'https://aiget.dev/api/v1',
    apiKeyPrefix: 'ag_',
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
    websiteBaseUrl: 'https://aiget.dev',
    websitePath: '/fetchx',
    apiBaseUrl: 'https://aiget.dev/api/v1',
    apiKeyPrefix: 'ag_',
  },
  [ProductId.MEMOX]: {
    id: ProductId.MEMOX,
    name: 'Memox',
    description: 'AI memory API for long-term memory',
    websiteBaseUrl: 'https://aiget.dev',
    websitePath: '/memox',
    apiBaseUrl: 'https://aiget.dev/api/v1',
    apiKeyPrefix: 'ag_',
  },
  [ProductId.SANDX]: {
    id: ProductId.SANDX,
    name: 'Sandx',
    description: 'Agent sandbox for secure code execution',
    websiteBaseUrl: 'https://aiget.dev',
    websitePath: '/sandx',
    apiBaseUrl: 'https://aiget.dev/api/v1',
    apiKeyPrefix: 'ag_',
  },
};
