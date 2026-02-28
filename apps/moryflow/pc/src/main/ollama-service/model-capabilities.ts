/**
 * Ollama 模型能力推断逻辑
 * 根据模型名称和 family 推断能力、模态和限制
 */

import type {
  ModelCapabilities,
  ModelModalities,
  ModelLimits,
} from '@moryflow/model-bank/registry';
import type { OllamaModel, OllamaLocalModel } from './types.js';

/** 多模态模型家族 */
const MULTIMODAL_FAMILIES = ['llava', 'bakllava', 'llama3.2-vision', 'minicpm-v', 'moondream'];

/** 推理模型关键字 */
const REASONING_KEYWORDS = ['deepseek-r1', 'qwq', 'marco-o1', 'o1', 'o3'];

/** 支持工具调用的模型家族前缀 */
const TOOL_CALL_PREFIXES = ['llama3', 'qwen2', 'qwen3', 'mistral', 'command-r', 'gemma2'];

/** 模型家族上下文窗口映射 */
const CONTEXT_WINDOW_MAP: Record<string, number> = {
  'qwen2.5': 128_000,
  qwen2: 128_000,
  qwen3: 128_000,
  'llama3.2': 128_000,
  'llama3.1': 128_000,
  llama3: 8_000,
  mistral: 32_000,
  gemma2: 8_000,
  phi3: 128_000,
  phi4: 128_000,
  'deepseek-r1': 64_000,
  deepseek: 64_000,
  'command-r': 128_000,
};

/** 默认上下文窗口 */
const DEFAULT_CONTEXT_WINDOW = 4_000;

/** 默认最大输出 */
const DEFAULT_MAX_OUTPUT = 4_096;

/**
 * 判断是否为多模态模型
 */
function isMultimodal(model: OllamaModel): boolean {
  const families = model.details.families || [model.details.family];
  return families.some((f) => MULTIMODAL_FAMILIES.some((mf) => f.toLowerCase().includes(mf)));
}

/**
 * 判断是否支持推理模式
 */
function supportsReasoning(model: OllamaModel): boolean {
  const name = model.name.toLowerCase();
  return REASONING_KEYWORDS.some((kw) => name.includes(kw));
}

/**
 * 判断是否支持工具调用
 */
function supportsToolCall(model: OllamaModel): boolean {
  const family = model.details.family.toLowerCase();
  return TOOL_CALL_PREFIXES.some((prefix) => family.startsWith(prefix));
}

/**
 * 获取上下文窗口大小
 */
function getContextWindow(model: OllamaModel): number {
  const family = model.details.family.toLowerCase();
  for (const [key, value] of Object.entries(CONTEXT_WINDOW_MAP)) {
    if (family.includes(key)) {
      return value;
    }
  }
  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * 推断模型能力
 */
export function inferCapabilities(model: OllamaModel): ModelCapabilities {
  return {
    attachment: isMultimodal(model),
    reasoning: supportsReasoning(model),
    temperature: true,
    toolCall: supportsToolCall(model),
    openWeights: true,
  };
}

/**
 * 推断模型模态
 */
export function inferModalities(model: OllamaModel): ModelModalities {
  const multimodal = isMultimodal(model);
  return {
    input: multimodal ? ['text', 'image'] : ['text'],
    output: ['text'],
  };
}

/**
 * 推断模型限制
 */
export function inferLimits(model: OllamaModel): ModelLimits {
  return {
    context: getContextWindow(model),
    output: DEFAULT_MAX_OUTPUT,
  };
}

/**
 * 格式化模型显示名称
 * 例如：qwen2.5:7b -> Qwen 2.5 7B
 */
export function formatModelName(name: string): string {
  const [base, tag] = name.split(':');
  const formatted = base
    .split(/[-_.]/)
    .map((part) => {
      // 数字保持原样
      if (/^\d+/.test(part)) return part;
      // 首字母大写
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');

  if (tag) {
    return `${formatted} ${tag.toUpperCase()}`;
  }
  return formatted;
}

/**
 * 将 Ollama 模型转换为 Moryflow 内部格式
 */
export function convertToLocalModel(model: OllamaModel): OllamaLocalModel {
  return {
    id: model.name,
    name: formatModelName(model.name),
    size: model.size,
    modifiedAt: model.modified_at,
    capabilities: inferCapabilities(model),
    modalities: inferModalities(model),
    limits: inferLimits(model),
    details: model.details,
  };
}
