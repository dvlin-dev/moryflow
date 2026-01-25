/**
 * [PROVIDES]: Runtime Hook 定义与工具包装
 * [DEPENDS]: @openai/agents-core
 * [POS]: Agent Runtime Hook 接口（chat.params/system, tool.before/after）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { FunctionTool, ModelSettings, Tool } from '@openai/agents-core';
import type { AgentContext } from './types';

export type ChatSystemHook = {
  mode?: 'append' | 'prepend' | 'replace';
  text?: string;
};

export type ChatParamsHook = Partial<ModelSettings>;

export type ToolHookRule = {
  tool?: string;
  mergeInput?: Record<string, unknown>;
  prependText?: string;
  appendText?: string;
};

export type RuntimeHooksConfig = {
  chat?: {
    system?: ChatSystemHook;
    params?: ChatParamsHook;
  };
  tool?: {
    before?: ToolHookRule[];
    after?: ToolHookRule[];
  };
};

const TOOL_HOOK_WRAPPED = Symbol('tool-hook');

const MODEL_SETTINGS_KEYS = new Set<keyof ModelSettings>([
  'temperature',
  'topP',
  'frequencyPenalty',
  'presencePenalty',
  'toolChoice',
  'parallelToolCalls',
  'truncation',
  'maxTokens',
  'store',
  'promptCacheRetention',
  'reasoning',
  'text',
  'providerData',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const globPatternToRegex = (pattern: string): RegExp => {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withGlob =
    escaped.replace(/\*\*/g, '<<<GLOBSTAR>>>').replace(/\*/g, '[^/]*').replace(/\?/g, '.') ?? '';
  const finalPattern = withGlob.replace(/<<<GLOBSTAR>>>/g, '.*');
  return new RegExp(`^${finalPattern}$`);
};

const matchPattern = (pattern: string | undefined, target: string): boolean => {
  if (!pattern) return true;
  if (pattern.startsWith('regex:')) {
    const raw = pattern.slice('regex:'.length);
    try {
      return new RegExp(raw).test(target);
    } catch {
      return false;
    }
  }
  return globPatternToRegex(pattern).test(target);
};

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const applyToolBefore = (input: string, rule: ToolHookRule): string => {
  if (!rule.mergeInput) {
    return input;
  }
  if (!isRecord(rule.mergeInput)) {
    return input;
  }
  const parsed = safeJsonParse(input);
  if (!isRecord(parsed)) {
    return input;
  }
  return JSON.stringify({ ...rule.mergeInput, ...parsed });
};

const applyToolAfter = (output: unknown, rule: ToolHookRule): unknown => {
  if (typeof output !== 'string') {
    return output;
  }
  const prefix = normalizeText(rule.prependText) ?? '';
  const suffix = normalizeText(rule.appendText) ?? '';
  if (!prefix && !suffix) {
    return output;
  }
  return `${prefix}${output}${suffix}`;
};

export const sanitizeModelSettings = (input: unknown): Partial<ModelSettings> | undefined => {
  if (!isRecord(input)) return undefined;
  const result: Partial<ModelSettings> = {};
  for (const key of MODEL_SETTINGS_KEYS) {
    if (key in input) {
      const value = (input as Record<string, unknown>)[key as string];
      if (value !== undefined) {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const sanitizeHooksConfig = (input: unknown): RuntimeHooksConfig | undefined => {
  if (!isRecord(input)) return undefined;
  const config: RuntimeHooksConfig = {};

  const chat = isRecord(input.chat) ? input.chat : undefined;
  if (chat) {
    const params = sanitizeModelSettings(chat.params);
    const system = isRecord(chat.system) ? chat.system : undefined;
    const systemText = normalizeText(system?.text);
    if (params || systemText) {
      config.chat = {};
      if (params) {
        config.chat.params = params;
      }
      if (systemText) {
        const mode = normalizeText(system?.mode) as ChatSystemHook['mode'] | undefined;
        config.chat.system = {
          mode: mode === 'prepend' || mode === 'replace' || mode === 'append' ? mode : 'append',
          text: systemText,
        };
      }
    }
  }

  const tool = isRecord(input.tool) ? input.tool : undefined;
  const normalizeRules = (rules: unknown): ToolHookRule[] | undefined => {
    if (!Array.isArray(rules)) return undefined;
    const cleaned = rules
      .map((rule) => {
        if (!isRecord(rule)) return null;
        const toolName = normalizeText(rule.tool);
        const mergeInput = isRecord(rule.mergeInput) ? rule.mergeInput : undefined;
        const prependText = normalizeText(rule.prependText);
        const appendText = normalizeText(rule.appendText);
        if (!toolName && !mergeInput && !prependText && !appendText) return null;
        return {
          tool: toolName,
          mergeInput,
          prependText,
          appendText,
        } satisfies ToolHookRule;
      })
      .filter(Boolean) as ToolHookRule[];
    return cleaned.length > 0 ? cleaned : undefined;
  };

  if (tool) {
    const before = normalizeRules(tool.before);
    const after = normalizeRules(tool.after);
    if (before || after) {
      config.tool = {};
      if (before) {
        config.tool.before = before;
      }
      if (after) {
        config.tool.after = after;
      }
    }
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

export const applyChatSystemHook = (basePrompt: string, hook?: ChatSystemHook): string => {
  if (!hook?.text) return basePrompt;
  const text = hook.text.trim();
  if (!text) return basePrompt;
  const mode = hook.mode ?? 'append';
  if (mode === 'replace') return text;
  if (mode === 'prepend') return `${text}\n\n${basePrompt}`.trim();
  return `${basePrompt}\n\n${text}`.trim();
};

export const applyChatParamsHook = (
  base: ModelSettings | undefined,
  hook?: ChatParamsHook
): ModelSettings | undefined => {
  if (!hook) return base;
  const overrides = sanitizeModelSettings(hook);
  if (!overrides) return base;
  const merged: ModelSettings = {
    ...(base ?? {}),
    ...overrides,
  };
  if (base?.reasoning || overrides.reasoning) {
    merged.reasoning = {
      ...(base?.reasoning ?? {}),
      ...(overrides.reasoning ?? {}),
    };
  }
  if (base?.text || overrides.text) {
    merged.text = {
      ...(base?.text ?? {}),
      ...(overrides.text ?? {}),
    };
  }
  return merged;
};

export const wrapToolWithHooks = (
  tool: Tool<AgentContext>,
  hooks?: RuntimeHooksConfig
): Tool<AgentContext> => {
  if (!hooks?.tool) return tool;
  if ((tool as Tool<AgentContext> & Record<symbol, boolean>)[TOOL_HOOK_WRAPPED]) {
    return tool;
  }
  if (tool.type !== 'function') {
    throw new Error(
      `[hook] Unsupported tool type: ${tool.type}. Only function tools can be wrapped.`
    );
  }

  const beforeRules = hooks.tool.before ?? [];
  const afterRules = hooks.tool.after ?? [];

  const wrapped: FunctionTool<AgentContext> = {
    ...tool,
    async invoke(runContext, input, details) {
      let nextInput = input;
      if (beforeRules.length > 0) {
        try {
          for (const rule of beforeRules) {
            if (matchPattern(rule.tool, tool.name)) {
              nextInput = applyToolBefore(nextInput, rule);
            }
          }
        } catch (error) {
          console.warn('[hook] tool.before failed', error);
        }
      }

      const output = await tool.invoke(runContext, nextInput, details);

      if (afterRules.length > 0) {
        try {
          let nextOutput = output;
          for (const rule of afterRules) {
            if (matchPattern(rule.tool, tool.name)) {
              nextOutput = applyToolAfter(nextOutput, rule);
            }
          }
          return nextOutput;
        } catch (error) {
          console.warn('[hook] tool.after failed', error);
          return output;
        }
      }

      return output;
    },
  };

  Object.defineProperty(wrapped, TOOL_HOOK_WRAPPED, {
    value: true,
    enumerable: false,
  });

  return wrapped;
};

export const wrapToolsWithHooks = (
  tools: Tool<AgentContext>[],
  hooks?: RuntimeHooksConfig
): Tool<AgentContext>[] => tools.map((tool) => wrapToolWithHooks(tool, hooks));
