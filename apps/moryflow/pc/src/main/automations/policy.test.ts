/* @vitest-environment node */

import { describe, expect, it } from 'vitest';
import { mapAutomationExecutionPolicyToRuntimeConfig } from './policy.js';

describe('automation execution policy mapping', () => {
  it('maps deny network + vault_only filesystem to runtime permission override', () => {
    const override = mapAutomationExecutionPolicyToRuntimeConfig({
      approvalMode: 'unattended',
      toolPolicy: {
        allow: [{ tool: 'Read' }, { tool: 'Read' }],
      },
      networkPolicy: {
        mode: 'deny',
      },
      fileSystemPolicy: {
        mode: 'vault_only',
      },
      requiresExplicitConfirmation: true,
    });

    expect(override.permission?.toolPolicy).toEqual({
      allow: [{ tool: 'Read' }],
    });
    expect(override.permission?.rules).toEqual(
      expect.arrayContaining([
        { domain: 'read', pattern: 'vault:**', decision: 'allow' },
        { domain: 'read', pattern: 'fs:**', decision: 'deny' },
        { domain: 'edit', pattern: 'vault:**', decision: 'allow' },
        { domain: 'edit', pattern: 'fs:**', decision: 'deny' },
        { domain: 'web_fetch', pattern: 'url:**', decision: 'deny' },
        { domain: 'web_search', pattern: 'query:**', decision: 'deny' },
      ])
    );
  });

  it('maps allowlists to explicit allow rules after global deny', () => {
    const override = mapAutomationExecutionPolicyToRuntimeConfig({
      approvalMode: 'unattended',
      toolPolicy: {
        allow: [{ tool: 'WebFetch' }],
      },
      networkPolicy: {
        mode: 'allowlist',
        allowHosts: ['api.example.com'],
      },
      fileSystemPolicy: {
        mode: 'allowlist',
        allowPaths: ['reports', '/tmp/exports'],
      },
      requiresExplicitConfirmation: true,
    });

    expect(override.permission?.rules).toEqual(
      expect.arrayContaining([
        { domain: 'web_fetch', pattern: 'url:**', decision: 'deny' },
        { domain: 'web_fetch', pattern: 'url:https://api.example.com/**', decision: 'allow' },
        { domain: 'read', pattern: 'vault:**', decision: 'deny' },
        { domain: 'read', pattern: 'vault:/reports/**', decision: 'allow' },
        { domain: 'edit', pattern: 'fs:/tmp/exports/**', decision: 'allow' },
      ])
    );
  });
});
