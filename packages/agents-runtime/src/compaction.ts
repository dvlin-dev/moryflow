/**
 * [PROVIDES]: Compaction 触发/裁剪/摘要重写核心逻辑
 * [DEPENDS]: @openai/agents-core, @ai-sdk/provider
 * [POS]: Agent Runtime 控制面（Compaction）统一入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { LanguageModelV3 } from '@ai-sdk/provider';
import { system, type AgentInputItem, type SystemMessageItem } from '@openai/agents-core';

export interface CompactionConfig {
  contextWindow?: number;
  outputBudget?: number;
  triggerRatio?: number;
  fallbackCharLimit?: number;
  protectedTurns?: number;
  protectedToolNames?: string[];
}

export interface CompactionStats {
  beforeChars: number;
  beforeTokens: number;
  afterChars: number;
  afterTokens: number;
  summaryChars: number;
  summaryTokens: number;
  droppedToolTypes: Record<string, number>;
}

export interface CompactionResult {
  triggered: boolean;
  summaryApplied: boolean;
  history: AgentInputItem[];
  stats: CompactionStats;
  historyChanged: boolean;
}

const SUMMARY_PREFIX = '【会话摘要】';
const SUMMARY_OUTPUT_TOKENS = 512;
const SUMMARY_PROMPT_TOKEN_BUFFER = 256;
const SUMMARY_PROMPT_BASE =
  '你是会话压缩助手。请根据以下对话记录生成一段精炼摘要，必须包含：\n' +
  '1) 已完成事项\n' +
  '2) 当前进度/状态\n' +
  '3) 涉及文件/路径\n' +
  '4) 下一步\n' +
  '要求：使用对话主要语言；不要编造；不要包含无关细节；直接输出摘要正文。\n\n' +
  '对话记录：\n';
const DEFAULT_FALLBACK_CHAR_LIMIT = 120_000;
const DEFAULT_TRIGGER_RATIO = 0.8;
const DEFAULT_OUTPUT_BUDGET = 4096;
const DEFAULT_OUTPUT_RATIO = 0.2;
const DEFAULT_PROTECTED_TURNS = 3;
const DEFAULT_PROTECTED_TOOL_NAMES = ['task', 'manage_plan', 'write', 'edit', 'move', 'delete'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getRole = (item: AgentInputItem): string | null => {
  if (!isRecord(item)) return null;
  const record = item as Record<string, unknown>;
  const role = record.role;
  return typeof role === 'string' ? role : null;
};

const getContent = (item: AgentInputItem): unknown => {
  if (!isRecord(item)) return undefined;
  const record = item as Record<string, unknown>;
  return record.content;
};

const safeStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  try {
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return val.toString();
        if (val instanceof Error) {
          return { name: val.name, message: val.message, stack: val.stack };
        }
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      },
      2
    );
    return typeof json === 'string' ? json : String(value);
  } catch {
    return String(value);
  }
};

const extractTextFromContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return '';
      const record = entry as Record<string, unknown>;
      return typeof record.text === 'string' ? record.text : '';
    })
    .filter(Boolean)
    .join('\n');
};

const renderItemText = (item: AgentInputItem): string => {
  if (!isRecord(item)) return safeStringify(item);

  const role = getRole(item);
  const content = getContent(item);
  if (role === 'system' && typeof content === 'string') {
    return `System: ${content}`;
  }
  if (role === 'user') {
    const text = extractTextFromContent(content);
    return text ? `User: ${text}` : 'User: (no content)';
  }
  if (role === 'assistant') {
    const text = extractTextFromContent(content);
    return text ? `Assistant: ${text}` : 'Assistant: (no content)';
  }

  const renderToolInput = (value: unknown): string =>
    typeof value === 'string' ? value : safeStringify(value);
  const renderToolOutput = (value: unknown): string =>
    typeof value === 'string' ? value : safeStringify(value);

  if (typeof item.type === 'string') {
    switch (item.type) {
      case 'function_call':
        return `ToolCall(${String(item.name ?? 'tool')}): ${renderToolInput(item.arguments ?? '')}`;
      case 'function_call_result':
        return `ToolResult(${String(item.name ?? 'tool')}): ${renderToolOutput(item.output)}`;
      case 'shell_call':
        return `ShellCall: ${safeStringify(item.action)}`;
      case 'shell_call_output':
        return `ShellOutput: ${renderToolOutput(item.output)}`;
      case 'apply_patch_call':
        return `ApplyPatch: ${safeStringify(item.operation)}`;
      case 'apply_patch_call_output':
        return `ApplyPatchOutput: ${renderToolOutput(item.output ?? '')}`;
      case 'computer_call':
        return `ComputerCall: ${safeStringify(item.action)}`;
      case 'computer_call_result':
        return `ComputerResult: ${renderToolOutput(item.output)}`;
      case 'reasoning':
        return `Reasoning: ${extractTextFromContent(item.content)}`;
      case 'compaction':
        return `Compaction: ${String(item.encrypted_content ?? '')}`;
      default:
        return safeStringify(item);
    }
  }

  return safeStringify(item);
};

const estimateCharCount = (items: AgentInputItem[]): number =>
  items.reduce((total, item) => total + renderItemText(item).length, 0);

const resolveSummaryPromptCharLimit = (
  contextWindow: number | undefined,
  fallbackCharLimit: number
): number => {
  if (!contextWindow) {
    return fallbackCharLimit;
  }
  const maxInputTokens = Math.max(
    1,
    contextWindow - SUMMARY_OUTPUT_TOKENS - SUMMARY_PROMPT_TOKEN_BUFFER
  );
  return Math.max(1, Math.floor(maxInputTokens * 4));
};

const takeHistoryWithinCharLimit = (
  history: AgentInputItem[],
  maxChars: number
): AgentInputItem[] => {
  if (maxChars <= 0) return [];
  let total = 0;
  const selected: AgentInputItem[] = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    const text = renderItemText(item);
    const nextLength = text.length + (selected.length > 0 ? 1 : 0);
    if (nextLength > maxChars && selected.length === 0) {
      continue;
    }
    if (total + nextLength > maxChars) {
      break;
    }
    total += nextLength;
    selected.push(item);
  }
  return selected.reverse();
};

const getProtectedStartIndex = (items: AgentInputItem[], protectedTurns: number): number => {
  if (protectedTurns <= 0) return items.length;
  let userCount = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (getRole(item) === 'user') {
      userCount += 1;
      if (userCount >= protectedTurns) {
        return index;
      }
    }
  }
  return 0;
};

const isSummaryItem = (item: AgentInputItem): boolean => {
  if (getRole(item) !== 'system') return false;
  const content = getContent(item);
  if (typeof content !== 'string') return false;
  return content.trim().startsWith(SUMMARY_PREFIX);
};

const getToolOutputInfo = (
  item: AgentInputItem
): { toolName?: string; toolType: string } | null => {
  if (!isRecord(item) || typeof item.type !== 'string') return null;
  switch (item.type) {
    case 'function_call_result':
      return {
        toolName: typeof item.name === 'string' ? item.name : undefined,
        toolType: 'function_call_result',
      };
    case 'shell_call_output':
      return { toolType: 'shell_call_output' };
    case 'computer_call_result':
      return { toolType: 'computer_call_result' };
    case 'apply_patch_call_output':
      return { toolType: 'apply_patch_call_output' };
    default:
      return null;
  }
};

const pruneToolOutputs = (input: {
  history: AgentInputItem[];
  protectedIndex: number;
  protectedToolNames: Set<string>;
}) => {
  const { history, protectedIndex, protectedToolNames } = input;
  const droppedToolTypes: Record<string, number> = {};
  const pruned: AgentInputItem[] = [];

  history.forEach((item, index) => {
    if (index >= protectedIndex) {
      pruned.push(item);
      return;
    }

    const info = getToolOutputInfo(item);
    if (!info) {
      pruned.push(item);
      return;
    }

    if (info.toolName && protectedToolNames.has(info.toolName)) {
      pruned.push(item);
      return;
    }

    const key = info.toolName ?? info.toolType;
    droppedToolTypes[key] = (droppedToolTypes[key] ?? 0) + 1;
  });

  return { pruned, droppedToolTypes };
};

const buildSummaryPrompt = (historyText: string): string => `${SUMMARY_PROMPT_BASE}${historyText}`;

const extractTextFromModelResult = (
  result: Awaited<ReturnType<LanguageModelV3['doGenerate']>>
): string => {
  const textContent = result.content.find((c) => c.type === 'text');
  return textContent?.type === 'text' ? textContent.text : '';
};

export const generateCompactionSummary = async (
  model: LanguageModelV3,
  history: AgentInputItem[]
): Promise<string> => {
  const historyText = history.map((item) => renderItemText(item)).join('\n');
  const prompt = buildSummaryPrompt(historyText);

  const result = await model.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxOutputTokens: 512,
  });

  return extractTextFromModelResult(result).trim();
};

const normalizeSummaryContent = (summary: string): string => {
  const trimmed = summary.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith(SUMMARY_PREFIX)) {
    return trimmed.slice(SUMMARY_PREFIX.length).trim();
  }
  return trimmed;
};

const buildSummaryItem = (summary: string): SystemMessageItem => {
  const normalized = normalizeSummaryContent(summary);
  const content = normalized ? `${SUMMARY_PREFIX}\n${normalized}` : SUMMARY_PREFIX;
  return system(content);
};

export const compactHistory = async (input: {
  history: AgentInputItem[];
  summaryBuilder: (history: AgentInputItem[]) => Promise<string>;
  config?: CompactionConfig;
}): Promise<CompactionResult> => {
  const { history, summaryBuilder, config } = input;
  const fallbackCharLimit = config?.fallbackCharLimit ?? DEFAULT_FALLBACK_CHAR_LIMIT;
  const triggerRatio = config?.triggerRatio ?? DEFAULT_TRIGGER_RATIO;
  const protectedTurns = config?.protectedTurns ?? DEFAULT_PROTECTED_TURNS;
  const protectedToolNames = new Set(config?.protectedToolNames ?? DEFAULT_PROTECTED_TOOL_NAMES);

  const beforeChars = estimateCharCount(history);
  const beforeTokens = Math.ceil(beforeChars / 4);

  const contextWindow = config?.contextWindow;
  const outputBudget =
    config?.outputBudget ??
    (contextWindow
      ? Math.min(DEFAULT_OUTPUT_BUDGET, Math.floor(contextWindow * DEFAULT_OUTPUT_RATIO))
      : 0);
  const usable = contextWindow ? Math.max(1, contextWindow - outputBudget) : undefined;
  const summaryPromptCharLimit = resolveSummaryPromptCharLimit(contextWindow, fallbackCharLimit);
  const summaryHistoryCharLimit = Math.max(0, summaryPromptCharLimit - SUMMARY_PROMPT_BASE.length);

  const overTokenThreshold = usable ? beforeTokens > usable * triggerRatio : false;
  const overCharThreshold = !usable ? beforeChars > fallbackCharLimit : false;
  const triggered = overTokenThreshold || overCharThreshold;

  if (!triggered) {
    return {
      triggered: false,
      summaryApplied: false,
      history,
      stats: {
        beforeChars,
        beforeTokens,
        afterChars: beforeChars,
        afterTokens: beforeTokens,
        summaryChars: 0,
        summaryTokens: 0,
        droppedToolTypes: {},
      },
      historyChanged: false,
    };
  }

  const filteredHistory = history.filter((item) => !isSummaryItem(item));
  const protectedIndex = getProtectedStartIndex(filteredHistory, protectedTurns);
  const { pruned, droppedToolTypes } = pruneToolOutputs({
    history: filteredHistory,
    protectedIndex,
    protectedToolNames,
  });
  const summaryInput = takeHistoryWithinCharLimit(filteredHistory, summaryHistoryCharLimit);
  const summaryFallbackInput =
    summaryInput.length > 0
      ? summaryInput
      : takeHistoryWithinCharLimit(pruned, summaryHistoryCharLimit);

  let summaryText = '';
  let summaryApplied = false;
  let summaryItemContentLength = 0;
  let finalHistory = pruned;

  try {
    summaryText = await summaryBuilder(summaryFallbackInput);
    summaryText = normalizeSummaryContent(summaryText);
    if (summaryText) {
      const summaryItem = buildSummaryItem(summaryText);
      summaryItemContentLength = summaryItem.content.length;
      const recentItems = filteredHistory
        .slice(protectedIndex)
        .filter((item) => !isSummaryItem(item));
      finalHistory = [summaryItem, ...recentItems];
      summaryApplied = true;
    }
  } catch {
    summaryApplied = false;
  }

  const afterChars = estimateCharCount(finalHistory);
  const afterTokens = Math.ceil(afterChars / 4);
  const summaryChars = summaryApplied ? summaryItemContentLength : 0;
  const summaryTokens = summaryApplied ? Math.ceil(summaryChars / 4) : 0;
  const historyChanged = summaryApplied || pruned.length !== history.length;

  return {
    triggered: true,
    summaryApplied,
    history: finalHistory,
    stats: {
      beforeChars,
      beforeTokens,
      afterChars,
      afterTokens,
      summaryChars,
      summaryTokens,
      droppedToolTypes,
    },
    historyChanged,
  };
};

export const DEFAULT_COMPACTION_CONFIG = {
  fallbackCharLimit: DEFAULT_FALLBACK_CHAR_LIMIT,
  triggerRatio: DEFAULT_TRIGGER_RATIO,
  protectedTurns: DEFAULT_PROTECTED_TURNS,
  protectedToolNames: DEFAULT_PROTECTED_TOOL_NAMES,
} satisfies Omit<CompactionConfig, 'contextWindow' | 'outputBudget'>;
