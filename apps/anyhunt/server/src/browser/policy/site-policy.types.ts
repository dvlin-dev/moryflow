/**
 * [DEFINES]: BrowserSitePolicy / RetryBudget / PolicyDecision
 * [USED_BY]: site-policy.service, browser-session.service
 * [POS]: Browser 站点策略的类型与默认策略
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export interface RetryBudget {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface BrowserSitePolicy {
  id: string;
  hostPattern: string;
  automationAllowed: boolean;
  maxRps: number;
  maxBurst: number;
  maxConcurrentNavigationsPerHost: number;
  retryBudget: RetryBudget;
  respectRobots: boolean;
}

export interface PolicyDecision {
  host: string;
  policyId: string;
  allowed: boolean;
  reason: 'automation_disabled' | null;
}

/**
 * 默认策略（保守阈值 + 默认允许）。
 * 若后续需要 fail-close，可将 automationAllowed 调整为 false 并显式配置 allowlist。
 */
export const DEFAULT_SITE_POLICY: BrowserSitePolicy = {
  id: 'default',
  hostPattern: '*',
  automationAllowed: true,
  maxRps: 3,
  maxBurst: 6,
  maxConcurrentNavigationsPerHost: 2,
  retryBudget: {
    maxAttempts: 3,
    baseDelayMs: 300,
    maxDelayMs: 2000,
  },
  respectRobots: true,
};

/**
 * 当前无强制内置 deny 策略；由配置驱动扩展。
 */
export const SITE_POLICY_PRESETS: BrowserSitePolicy[] = [];
