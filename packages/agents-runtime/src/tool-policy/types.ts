/**
 * [DEFINES]: Tool Policy 结构化规则类型
 * [USED_BY]: permission-runtime, runtime-config, UI DSL 显示层
 * [POS]: Ask 模式同类 allow 规则的唯一类型事实源
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

const TOOL_POLICY_TOOLS = ['Read', 'Edit', 'Bash', 'WebFetch', 'WebSearch', 'Mcp'] as const;

export type ToolPolicyRuleTool = (typeof TOOL_POLICY_TOOLS)[number];

export type ToolPolicyRule =
  | {
      tool: Exclude<ToolPolicyRuleTool, 'Bash'>;
    }
  | {
      tool: 'Bash';
      commandPattern: string;
    };

export type ToolPolicy = {
  allow: ToolPolicyRule[];
};

export const EMPTY_TOOL_POLICY: ToolPolicy = {
  allow: [],
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isToolPolicyRuleTool = (value: unknown): value is ToolPolicyRuleTool =>
  typeof value === 'string' && TOOL_POLICY_TOOLS.includes(value as ToolPolicyRuleTool);

const isBashCommandPattern = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.includes(':');

export const isToolPolicyRule = (value: unknown): value is ToolPolicyRule => {
  if (!isRecord(value) || !isToolPolicyRuleTool(value.tool)) {
    return false;
  }
  if (value.tool === 'Bash') {
    return isBashCommandPattern(value.commandPattern);
  }
  return true;
};

export const isToolPolicy = (value: unknown): value is ToolPolicy => {
  if (!isRecord(value)) {
    return false;
  }
  if (!Array.isArray(value.allow)) {
    return false;
  }
  return value.allow.every(isToolPolicyRule);
};
