/**
 * [PROVIDES]: Tool Policy DSL 显示转换（结构化规则 <-> 可读字符串）
 * [DEPENDS]: tool-policy/types
 * [POS]: 规则持久化层与 UI 展示层之间的可读桥接
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { isToolPolicyRule, type ToolPolicyRule, type ToolPolicyRuleTool } from './types';

const TOOL_NAME_ALIASES: Record<string, ToolPolicyRuleTool> = {
  Read: 'Read',
  Edit: 'Edit',
  Write: 'Edit',
  Bash: 'Bash',
  WebFetch: 'WebFetch',
  WebSearch: 'WebSearch',
  Mcp: 'Mcp',
};

export const toolPolicyRuleToDsl = (rule: ToolPolicyRule): string => {
  if (rule.tool === 'Bash') {
    return `Bash(${rule.commandPattern})`;
  }
  return rule.tool;
};

export const parseToolPolicyRuleDsl = (dsl: string): ToolPolicyRule | null => {
  const normalized = dsl.trim();
  if (!normalized) {
    return null;
  }
  const match = normalized.match(/^([A-Za-z]+)(?:\(([^)]+)\))?$/);
  if (!match) {
    return null;
  }
  const [, rawTool, rawArg] = match;
  const tool = TOOL_NAME_ALIASES[rawTool];
  if (!tool) {
    return null;
  }
  const parsedRule: unknown =
    tool === 'Bash'
      ? {
          tool,
          commandPattern: rawArg?.trim() ?? '',
        }
      : { tool };
  return isToolPolicyRule(parsedRule) ? parsedRule : null;
};
