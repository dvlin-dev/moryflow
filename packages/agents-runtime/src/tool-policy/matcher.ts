/**
 * [PROVIDES]: Tool Policy 规则命中（Ask 同类 allow）
 * [DEPENDS]: permission types, tool-policy/types, tool-policy/dsl
 * [POS]: 权限决策链中的同类放行判定入口
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import path from 'node:path';
import type { PermissionDomain } from '../permission';
import { toolPolicyRuleToDsl } from './dsl';
import {
  isToolPolicyRule,
  type ToolPolicy,
  type ToolPolicyRule,
  type ToolPolicyRuleTool,
} from './types';

const AMBIGUOUS_BASH_PATTERN = /[`]|(\$\()|<<|>|<|\n/;
const COMMAND_SEGMENT_SEPARATOR = /\s*(?:&&|\|\||;|\|)\s*/;

export type ToolPolicyMatchInput = {
  domain: PermissionDomain;
  targets: string[];
  policy: ToolPolicy;
};

export type ToolPolicyMatchResult =
  | {
      matched: true;
      rule: ToolPolicyRule;
      signature: string;
    }
  | {
      matched: false;
    };

const normalizeRule = (rule: ToolPolicyRule): ToolPolicyRule => {
  if (rule.tool !== 'Bash') {
    return { tool: rule.tool };
  }
  return {
    tool: 'Bash',
    commandPattern: rule.commandPattern.trim(),
  };
};

export const normalizeToolPolicy = (policy: ToolPolicy): ToolPolicy => {
  const signatureSet = new Set<string>();
  const allow: ToolPolicyRule[] = [];
  for (const rawRule of policy.allow) {
    if (!isToolPolicyRule(rawRule)) {
      continue;
    }
    const rule = normalizeRule(rawRule);
    const signature = toolPolicyRuleToDsl(rule);
    if (signatureSet.has(signature)) {
      continue;
    }
    signatureSet.add(signature);
    allow.push(rule);
  }
  return { allow };
};

const resolveDomainTool = (domain: PermissionDomain): ToolPolicyRuleTool => {
  switch (domain) {
    case 'read':
      return 'Read';
    case 'edit':
      return 'Edit';
    case 'bash':
      return 'Bash';
    case 'web_fetch':
      return 'WebFetch';
    case 'web_search':
      return 'WebSearch';
    case 'mcp':
      return 'Mcp';
    default:
      return 'Read';
  }
};

const splitCommandSegments = (command: string): string[] => {
  const trimmed = command.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(COMMAND_SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
};

const extractCommandFamily = (segment: string): string | null => {
  const tokenMatch = segment.match(/^([^\s]+)/);
  if (!tokenMatch) {
    return null;
  }
  const rawCommand = tokenMatch[1];
  if (!rawCommand) {
    return null;
  }
  const commandName = path.posix.basename(rawCommand).toLowerCase();
  return commandName.length > 0 ? commandName : null;
};

const collectBashCommandFamilies = (command: string): string[] | null => {
  if (!command || AMBIGUOUS_BASH_PATTERN.test(command)) {
    return null;
  }
  const segments = splitCommandSegments(command);
  if (segments.length === 0) {
    return null;
  }
  const families: string[] = [];
  for (const segment of segments) {
    const family = extractCommandFamily(segment);
    if (!family) {
      return null;
    }
    families.push(family);
  }
  return families;
};

const extractBashCommandsFromTargets = (targets: string[]): string[] =>
  targets
    .filter((target) => target.startsWith('shell:'))
    .map((target) => target.slice('shell:'.length).trim())
    .filter((command) => command.length > 0);

const matchBashRule = (rule: Extract<ToolPolicyRule, { tool: 'Bash' }>, targets: string[]) => {
  const pattern = rule.commandPattern.trim();
  const patternMatch = pattern.match(/^([a-zA-Z0-9._-]+):\*$/);
  if (!patternMatch) {
    return false;
  }
  const expectedFamily = patternMatch[1].toLowerCase();
  const commands = extractBashCommandsFromTargets(targets);
  if (commands.length === 0) {
    return false;
  }
  for (const command of commands) {
    const families = collectBashCommandFamilies(command);
    if (!families || families.length === 0) {
      return false;
    }
    if (!families.every((family) => family === expectedFamily)) {
      return false;
    }
  }
  return true;
};

export const buildToolPolicyAllowRule = (input: {
  domain: PermissionDomain;
  targets: string[];
}): ToolPolicyRule | null => {
  const tool = resolveDomainTool(input.domain);
  if (tool !== 'Bash') {
    return { tool };
  }
  const commands = extractBashCommandsFromTargets(input.targets);
  if (commands.length === 0) {
    return null;
  }
  const commandFamilies = new Set<string>();
  for (const command of commands) {
    const families = collectBashCommandFamilies(command);
    if (!families || families.length === 0) {
      return null;
    }
    for (const family of families) {
      commandFamilies.add(family);
    }
  }
  if (commandFamilies.size !== 1) {
    return null;
  }
  return {
    tool: 'Bash',
    commandPattern: `${[...commandFamilies][0]}:*`,
  };
};

export const matchToolPolicy = (input: ToolPolicyMatchInput): ToolPolicyMatchResult => {
  const normalized = normalizeToolPolicy(input.policy);
  if (normalized.allow.length === 0) {
    return { matched: false };
  }
  const expectedTool = resolveDomainTool(input.domain);
  for (const rule of normalized.allow) {
    if (rule.tool !== expectedTool) {
      continue;
    }
    if (rule.tool === 'Bash' && !matchBashRule(rule, input.targets)) {
      continue;
    }
    return {
      matched: true,
      rule,
      signature: toolPolicyRuleToDsl(rule),
    };
  }
  return { matched: false };
};
