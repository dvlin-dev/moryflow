/**
 * [DEFINES]: 产品标识类型
 * [USED_BY]: 所有产品
 * [POS]: 跨业务线共享类型（不代表账号/数据互通）
 */

export const ProductId = {
  FLOWX: 'flowx',
  FETCHX: 'fetchx',
  MEMOX: 'memox',
  SANDX: 'sandx',
} as const;

export type ProductId = (typeof ProductId)[keyof typeof ProductId];

export interface ProductInfo {
  id: ProductId;
  name: string;
  description: string;
  domain: string;
  apiDomain: string;
}

export const PRODUCT_INFOS: Record<ProductId, ProductInfo> = {
  [ProductId.FLOWX]: {
    id: ProductId.FLOWX,
    name: 'Flowx',
    description: 'Note-based AI workflow with website publishing',
    domain: 'flowx.aiget.dev',
    apiDomain: 'api.flowx.aiget.dev',
  },
  [ProductId.FETCHX]: {
    id: ProductId.FETCHX,
    name: 'Fetchx',
    description: 'Web data API (scrape, crawl, extract)',
    domain: 'fetchx.aiget.dev',
    apiDomain: 'api.fetchx.aiget.dev',
  },
  [ProductId.MEMOX]: {
    id: ProductId.MEMOX,
    name: 'Memox',
    description: 'AI memory API for long-term memory',
    domain: 'memox.aiget.dev',
    apiDomain: 'api.memox.aiget.dev',
  },
  [ProductId.SANDX]: {
    id: ProductId.SANDX,
    name: 'Sandx',
    description: 'Agent sandbox for secure code execution',
    domain: 'sandx.aiget.dev',
    apiDomain: 'api.sandx.aiget.dev',
  },
};
