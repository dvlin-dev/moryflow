/**
 * [PROVIDES]: parseLlmCapabilities, stringifyJsonSafe
 * [DEPENDS]: LlmModelCapabilities, ReasoningConfig
 * [POS]: LLM Admin 表单解析能力配置（含 reasoning）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import type { LlmModelCapabilities, ReasoningConfig } from './types';
import { ApiError } from '@/lib/api-client';

export function parseLlmCapabilities(
  json: Record<string, unknown> | string | null | undefined
): LlmModelCapabilities {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : (json ?? {});
    return {
      vision: data.vision === true,
      tools: data.tools === true,
      json: data.json === true,
      maxContextTokens: typeof data.maxContextTokens === 'number' ? data.maxContextTokens : 0,
      maxOutputTokens: typeof data.maxOutputTokens === 'number' ? data.maxOutputTokens : 0,
      reasoning: parseReasoningConfig(data.reasoning),
    };
  } catch {
    return {
      vision: false,
      tools: false,
      json: false,
      maxContextTokens: 0,
      maxOutputTokens: 0,
    };
  }
}

function parseReasoningConfig(data: unknown): ReasoningConfig | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const config = data as Record<string, unknown>;
  if (!config.enabled && !config.rawConfig) {
    return undefined;
  }
  return {
    enabled: config.enabled === true,
    effort: isValidEffort(config.effort) ? config.effort : 'medium',
    maxTokens: typeof config.maxTokens === 'number' ? config.maxTokens : undefined,
    exclude: config.exclude === true,
    rawConfig:
      config.rawConfig && typeof config.rawConfig === 'object'
        ? (config.rawConfig as Record<string, unknown>)
        : undefined,
  };
}

function isValidEffort(
  value: unknown
): value is 'xhigh' | 'high' | 'medium' | 'low' | 'minimal' | 'none' {
  return (
    typeof value === 'string' &&
    ['xhigh', 'high', 'medium', 'low', 'minimal', 'none'].includes(value)
  );
}

export function stringifyJsonSafe(value: unknown): string {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function getLlmQueryErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}
