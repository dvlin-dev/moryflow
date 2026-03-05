import { describe, expect, it } from 'vitest';
import {
  buildToolPolicyAllowRule,
  matchToolPolicy,
  normalizeToolPolicy,
  parseToolPolicyRuleDsl,
  toolPolicyRuleToDsl,
} from '../tool-policy';

describe('tool-policy', () => {
  it('normalizes and de-duplicates allow rules', () => {
    const normalized = normalizeToolPolicy({
      allow: [{ tool: 'Read' }, { tool: 'Read' }, { tool: 'Bash', commandPattern: 'git:*' }],
    });
    expect(normalized.allow).toEqual([{ tool: 'Read' }, { tool: 'Bash', commandPattern: 'git:*' }]);
  });

  it('matches read rule by domain', () => {
    const result = matchToolPolicy({
      domain: 'read',
      targets: ['fs:/external/a.md'],
      policy: { allow: [{ tool: 'Read' }] },
    });
    expect(result).toEqual({
      matched: true,
      rule: { tool: 'Read' },
      signature: 'Read',
    });
  });

  it('matches bash command family for single command', () => {
    const result = matchToolPolicy({
      domain: 'bash',
      targets: ['shell:git status'],
      policy: { allow: [{ tool: 'Bash', commandPattern: 'git:*' }] },
    });
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.signature).toBe('Bash(git:*)');
    }
  });

  it('does not match bash allow rule when command family is mixed', () => {
    const result = matchToolPolicy({
      domain: 'bash',
      targets: ['shell:git status && npm test'],
      policy: { allow: [{ tool: 'Bash', commandPattern: 'git:*' }] },
    });
    expect(result).toEqual({ matched: false });
  });

  it('builds bash allow rule from approval record targets', () => {
    expect(
      buildToolPolicyAllowRule({
        domain: 'bash',
        targets: ['shell:git commit -m "msg"'],
      })
    ).toEqual({ tool: 'Bash', commandPattern: 'git:*' });
  });

  it('returns null when bash targets contain mixed command families', () => {
    expect(
      buildToolPolicyAllowRule({
        domain: 'bash',
        targets: ['shell:git status && npm test'],
      })
    ).toBeNull();
  });

  it('supports DSL round-trip', () => {
    const parsed = parseToolPolicyRuleDsl('Bash(git:*)');
    expect(parsed).toEqual({ tool: 'Bash', commandPattern: 'git:*' });
    expect(toolPolicyRuleToDsl(parsed!)).toBe('Bash(git:*)');
  });
});
