/**
 * [PROVIDES]: 计费规则（billingKey -> cost），支持 env 覆盖
 * [DEPENDS]: process.env
 * [POS]: 计费配置中心（单一数据源）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及 apps/aiget/server/CLAUDE.md
 */

export const DEFAULT_BILLING_COST = 1;

export const BILLING_KEYS = [
  // Fetchx - L1 基础抓取
  'fetchx.scrape',
  'fetchx.batchScrape',
  'fetchx.crawl',
  'fetchx.map',
  'fetchx.extract',
  'fetchx.search',

  // Fetchx - L2 Browser（P1 计费模型优化）
  'fetchx.browser.session',
  'fetchx.browser.screenshot',
  'fetchx.browser.action',
  'fetchx.browser.snapshot',
  'fetchx.browser.tab',

  // Fetchx - L3 Agent（动态计费）
  'fetchx.agent',
  'fetchx.agent.estimate',

  // Memox
  'memox.memory.create',
  'memox.memory.search',
] as const;

export type BillingKey = (typeof BILLING_KEYS)[number];

export interface BillingRule {
  cost: number;
  /**
   * 命中缓存时不扣费（例如 scrape 返回 { fromCache: true }）。
   */
  skipIfFromCache?: boolean;
  /**
   * 失败时退费（异步任务在最终 FAILED 时退）。
   */
  refundOnFailure?: boolean;
}

const BASE_RULES: Record<BillingKey, BillingRule> = {
  // L1 基础抓取
  'fetchx.scrape': { cost: 1, skipIfFromCache: true, refundOnFailure: true },
  'fetchx.batchScrape': { cost: 1, refundOnFailure: true },
  'fetchx.crawl': { cost: 1, refundOnFailure: true },
  'fetchx.map': { cost: 1, refundOnFailure: true },
  'fetchx.extract': { cost: 1, refundOnFailure: true },
  'fetchx.search': { cost: 1, refundOnFailure: true },
  // L2 Browser（P1 计费模型优化：细粒度计费）
  'fetchx.browser.session': { cost: 1, refundOnFailure: false }, // 会话创建费
  'fetchx.browser.screenshot': { cost: 1, refundOnFailure: false }, // 截图费
  'fetchx.browser.action': { cost: 0, refundOnFailure: false }, // 操作免费（计入会话时长）
  'fetchx.browser.snapshot': { cost: 0, refundOnFailure: false }, // 快照免费
  'fetchx.browser.tab': { cost: 0, refundOnFailure: false }, // 标签页操作免费
  // L3 Agent（动态计费：基础费 + token费 + 工具调用费 + 时长费）
  'fetchx.agent': { cost: 1, refundOnFailure: true }, // 基础起步价
  'fetchx.agent.estimate': { cost: 0, refundOnFailure: false }, // 估算免费
  // Memox
  'memox.memory.create': { cost: 1, refundOnFailure: true },
  'memox.memory.search': { cost: 1, refundOnFailure: true },
};

/**
 * 运行时覆盖（最佳实践：配置集中、改动可控）：
 * - 设置 `BILLING_RULE_OVERRIDES_JSON` 为 JSON：{ "fetchx.scrape": 2, "memox.memory.search": 3 }
 * - 仅覆盖 cost；其他规则（skipIfFromCache/refundOnFailure）仍使用 BASE_RULES
 *
 * 说明：此覆盖是“重启生效”的设计。如果未来需要动态修改，
 * 可将规则迁移到数据库而不改变调用点。
 */
function loadCostOverridesFromEnv(): Partial<
  Record<BillingKey, number>
> | null {
  const raw = process.env.BILLING_RULE_OVERRIDES_JSON;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const overrides: Partial<Record<BillingKey, number>> = {};

    for (const key of BILLING_KEYS) {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        overrides[key] = value;
      }
    }

    return overrides;
  } catch {
    return null;
  }
}

let cachedOverrides: Partial<Record<BillingKey, number>> | null | undefined;

export function getBillingRule(key: BillingKey): BillingRule {
  const base = BASE_RULES[key] ?? {
    cost: DEFAULT_BILLING_COST,
    refundOnFailure: true,
  };

  if (cachedOverrides === undefined) {
    cachedOverrides = loadCostOverridesFromEnv();
  }

  const overrideCost = cachedOverrides?.[key];
  if (overrideCost === undefined) return base;

  return { ...base, cost: overrideCost };
}
