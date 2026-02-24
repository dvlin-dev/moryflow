import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SITE_POLICY,
  selectPolicyByHost,
  matchHostPattern,
  type BrowserSitePolicy,
} from '../policy';

const policy = (partial: Partial<BrowserSitePolicy>): BrowserSitePolicy => ({
  ...DEFAULT_SITE_POLICY,
  id: partial.id ?? 'p',
  hostPattern: partial.hostPattern ?? '*',
  automationAllowed: partial.automationAllowed ?? true,
  maxRps: partial.maxRps ?? 3,
  maxBurst: partial.maxBurst ?? 6,
  maxConcurrentNavigationsPerHost: partial.maxConcurrentNavigationsPerHost ?? 2,
  retryBudget: partial.retryBudget ?? DEFAULT_SITE_POLICY.retryBudget,
  respectRobots: partial.respectRobots ?? true,
});

describe('site policy matcher', () => {
  it('matches wildcard and exact host patterns', () => {
    expect(matchHostPattern('api.example.com', '*.example.com')).toBe(true);
    expect(matchHostPattern('example.com', '*.example.com')).toBe(true);
    expect(matchHostPattern('example.com', 'example.com')).toBe(true);
    expect(matchHostPattern('foo.bar.com', '*.example.com')).toBe(false);
  });

  it('prefers exact host policy over wildcard policy', () => {
    const selected = selectPolicyByHost('api.example.com', [
      policy({ id: 'wildcard', hostPattern: '*.example.com' }),
      policy({ id: 'exact', hostPattern: 'api.example.com' }),
    ]);
    expect(selected.id).toBe('exact');
  });

  it('prefers longer wildcard suffix', () => {
    const selected = selectPolicyByHost('a.b.example.com', [
      policy({ id: 'short', hostPattern: '*.example.com' }),
      policy({ id: 'long', hostPattern: '*.b.example.com' }),
    ]);
    expect(selected.id).toBe('long');
  });

  it('falls back to default policy when nothing matches', () => {
    const selected = selectPolicyByHost('unknown.test', []);
    expect(selected.id).toBe(DEFAULT_SITE_POLICY.id);
  });
});
