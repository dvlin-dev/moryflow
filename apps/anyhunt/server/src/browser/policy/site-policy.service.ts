/**
 * [INPUT]: host + 策略列表
 * [OUTPUT]: 匹配策略与准入决策
 * [POS]: Browser 站点策略匹配与准入判定（不包含限流实现）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Injectable } from '@nestjs/common';
import {
  DEFAULT_SITE_POLICY,
  SITE_POLICY_PRESETS,
  type BrowserSitePolicy,
  type PolicyDecision,
} from './site-policy.types';

export interface PolicyAssertInput {
  sessionId: string;
  host: string;
  url: string;
}

export class BrowserPolicyDeniedError extends Error {
  constructor(
    public readonly host: string,
    public readonly policyId: string,
    public readonly reason: 'automation_disabled',
  ) {
    super(`Automation is disabled for host: ${host}`);
    this.name = 'BrowserPolicyDeniedError';
  }
}

export function matchHostPattern(host: string, pattern: string): boolean {
  const normalizedHost = host.trim().toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();

  if (!normalizedHost || !normalizedPattern) return false;
  if (normalizedPattern === '*') return true;
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(2);
    return normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`);
  }
  return normalizedHost === normalizedPattern;
}

function patternPriority(pattern: string): number {
  const normalized = pattern.trim().toLowerCase();
  if (normalized === '*') return 1;
  if (normalized.startsWith('*.')) {
    return 100 + normalized.length;
  }
  return 1000 + normalized.length;
}

export function selectPolicyByHost(
  host: string,
  policies: BrowserSitePolicy[],
  fallback: BrowserSitePolicy = DEFAULT_SITE_POLICY,
): BrowserSitePolicy {
  const matched = policies.filter((policy) =>
    matchHostPattern(host, policy.hostPattern),
  );

  if (matched.length === 0) {
    return fallback;
  }

  return matched.sort((a, b) => {
    return patternPriority(b.hostPattern) - patternPriority(a.hostPattern);
  })[0];
}

@Injectable()
export class SitePolicyService {
  private readonly policies = [...SITE_POLICY_PRESETS];

  resolve(host: string): BrowserSitePolicy {
    return selectPolicyByHost(host, this.policies, DEFAULT_SITE_POLICY);
  }

  evaluate(host: string): PolicyDecision {
    const policy = this.resolve(host);
    if (!policy.automationAllowed) {
      return {
        host,
        policyId: policy.id,
        allowed: false,
        reason: 'automation_disabled',
      };
    }

    return {
      host,
      policyId: policy.id,
      allowed: true,
      reason: null,
    };
  }

  assertNavigationAllowed(input: PolicyAssertInput): void {
    const decision = this.evaluate(input.host);
    if (!decision.allowed) {
      throw new BrowserPolicyDeniedError(
        input.host,
        decision.policyId,
        'automation_disabled',
      );
    }
  }
}
