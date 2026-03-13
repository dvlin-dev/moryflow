import type {
  AutomationExecutionPolicy,
  AutomationFileSystemPolicy,
  AutomationNetworkPolicy,
} from '@moryflow/automations-core';
import {
  normalizeToolPolicy,
  type AgentRuntimeConfig,
  type PermissionRule,
} from '@moryflow/agents-runtime';

const normalizeHost = (rawHost: string): string => {
  const trimmed = rawHost.trim();
  if (!trimmed) {
    throw new Error('Automation network allowlist contains an empty host.');
  }
  if (trimmed.includes('://')) {
    return new URL(trimmed).host;
  }
  if (trimmed.includes('/')) {
    throw new Error(`Automation network allowlist host is invalid: ${trimmed}`);
  }
  return trimmed;
};

const toFilePatterns = (rawPath: string): string[] => {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    throw new Error('Automation filesystem allowlist contains an empty path.');
  }
  if (trimmed.startsWith('/')) {
    return [`fs:${trimmed}/**`];
  }
  return [`vault:/${trimmed.replace(/^\.?\//, '')}/**`];
};

const buildNetworkRules = (policy: AutomationNetworkPolicy): PermissionRule[] => {
  switch (policy.mode) {
    case 'inherit':
      return [];
    case 'deny':
      return [
        { domain: 'web_fetch', pattern: 'url:**', decision: 'deny' },
        { domain: 'web_search', pattern: 'query:**', decision: 'deny' },
      ];
    case 'allowlist':
      return [
        { domain: 'web_fetch', pattern: 'url:**', decision: 'deny' },
        { domain: 'web_search', pattern: 'query:**', decision: 'deny' },
        ...policy.allowHosts.flatMap((host) => {
          const normalizedHost = normalizeHost(host);
          return [
            {
              domain: 'web_fetch' as const,
              pattern: `url:http://${normalizedHost}/**`,
              decision: 'allow' as const,
            },
            {
              domain: 'web_fetch' as const,
              pattern: `url:https://${normalizedHost}/**`,
              decision: 'allow' as const,
            },
          ];
        }),
      ];
  }
};

const buildFileSystemRules = (policy: AutomationFileSystemPolicy): PermissionRule[] => {
  switch (policy.mode) {
    case 'inherit':
      return [];
    case 'deny':
      return [
        { domain: 'read', pattern: 'vault:**', decision: 'deny' },
        { domain: 'read', pattern: 'fs:**', decision: 'deny' },
        { domain: 'edit', pattern: 'vault:**', decision: 'deny' },
        { domain: 'edit', pattern: 'fs:**', decision: 'deny' },
      ];
    case 'vault_only':
      return [
        { domain: 'read', pattern: 'vault:**', decision: 'allow' },
        { domain: 'read', pattern: 'fs:**', decision: 'deny' },
        { domain: 'edit', pattern: 'vault:**', decision: 'allow' },
        { domain: 'edit', pattern: 'fs:**', decision: 'deny' },
      ];
    case 'allowlist':
      return [
        { domain: 'read', pattern: 'vault:**', decision: 'deny' },
        { domain: 'read', pattern: 'fs:**', decision: 'deny' },
        { domain: 'edit', pattern: 'vault:**', decision: 'deny' },
        { domain: 'edit', pattern: 'fs:**', decision: 'deny' },
        ...policy.allowPaths.flatMap((path) =>
          toFilePatterns(path).flatMap((pattern) => [
            { domain: 'read' as const, pattern, decision: 'allow' as const },
            { domain: 'edit' as const, pattern, decision: 'allow' as const },
          ])
        ),
      ];
  }
};

export const mapAutomationExecutionPolicyToRuntimeConfig = (
  policy: AutomationExecutionPolicy
): Pick<AgentRuntimeConfig, 'permission'> => {
  return {
    permission: {
      rules: [
        ...buildFileSystemRules(policy.fileSystemPolicy),
        ...buildNetworkRules(policy.networkPolicy),
      ],
      toolPolicy: normalizeToolPolicy(policy.toolPolicy),
    },
  };
};
