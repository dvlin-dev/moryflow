/**
 * [PROVIDES]: policy 模块统一导出
 * [POS]: Browser 站点策略入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
