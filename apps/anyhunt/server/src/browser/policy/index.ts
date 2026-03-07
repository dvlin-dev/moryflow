/**
 * [PROVIDES]: policy 模块统一导出
 * [POS]: Browser 站点策略入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

export {
  SitePolicyService,
  BrowserPolicyDeniedError,
  matchHostPattern,
  selectPolicyByHost,
  type PolicyAssertInput,
} from './site-policy.service';

export {
  SiteRateLimiterService,
  BrowserNavigationRateLimitError,
  type NavigationQuotaInput,
  type RateLimitReason,
} from './site-rate-limiter.service';

export {
  DEFAULT_SITE_POLICY,
  SITE_POLICY_PRESETS,
  type RetryBudget,
  type BrowserSitePolicy,
  type PolicyDecision,
} from './site-policy.types';
