/**
 * 预设模型注册表
 * 包含所有主流 AI 模型的能力定义
 */

import type { ModelRegistry } from './types'

/**
 * 模型注册表
 * key: 模型的标准 ID（用于跨服务商引用）
 * value: 模型的完整能力定义（不含 id 字段）
 */
export const modelRegistry: ModelRegistry = {
  // ============================================
  // OpenAI 模型
  // ============================================
  'gpt-5.1': {
    name: 'GPT-5.1',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 400000, output: 128000 },
    knowledgeCutoff: '2024-09-30',
    releaseDate: '2025-11-13',
  },
  'gpt-5.1-codex': {
    name: 'GPT-5.1 Codex',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 400000, output: 128000 },
    knowledgeCutoff: '2024-09-30',
    releaseDate: '2025-11-13',
  },
  'gpt-5.1-codex-mini': {
    name: 'GPT-5.1 Codex Mini',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 400000, output: 100000 },
    knowledgeCutoff: '2024-09-30',
    releaseDate: '2025-11-13',
  },
  'gpt-5': {
    name: 'GPT-5',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'audio', 'image', 'video'],
      output: ['text'],
    },
    limits: { context: 400000, output: 128000 },
    knowledgeCutoff: '2024-09-30',
    releaseDate: '2025-08-07',
  },
  'gpt-5-mini': {
    name: 'GPT-5 Mini',
    shortName: 'GPT-5 Mini',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 272000, output: 128000 },
    knowledgeCutoff: '2024-05-30',
    releaseDate: '2025-08-07',
  },
  'gpt-5-codex': {
    name: 'GPT-5 Codex',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 128000, output: 64000 },
    knowledgeCutoff: '2024-09-30',
    releaseDate: '2025-09-15',
  },
  'gpt-4.1': {
    name: 'GPT-4.1',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 1047576, output: 32768 },
    knowledgeCutoff: '2024-04',
    releaseDate: '2025-04-14',
  },
  'gpt-4o': {
    name: 'GPT-4o',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 128000, output: 16384 },
    knowledgeCutoff: '2023-09',
    releaseDate: '2024-05-13',
  },
  o3: {
    name: 'o3',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 100000 },
    knowledgeCutoff: '2024-05',
    releaseDate: '2025-04-16',
  },
  'o3-pro': {
    name: 'o3-pro',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 100000 },
    knowledgeCutoff: '2024-05',
    releaseDate: '2025-06-10',
  },
  'o3-mini': {
    name: 'o3-mini',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 200000, output: 100000 },
    knowledgeCutoff: '2024-05',
    releaseDate: '2024-12-20',
  },
  'o4-mini': {
    name: 'o4-mini',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: false,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 100000 },
    knowledgeCutoff: '2024-05',
    releaseDate: '2025-04-16',
  },

  // ============================================
  // Anthropic Claude 模型
  // ============================================
  'claude-opus-4-5': {
    name: 'Claude Opus 4.5',
    shortName: 'Opus 4.5',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 64000 },
    knowledgeCutoff: '2025-03-31',
    releaseDate: '2025-11-24',
  },
  'claude-4-5-sonnet': {
    name: 'Claude Sonnet 4.5',
    shortName: 'Sonnet 4.5',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 32000 },
    knowledgeCutoff: '2025-03-31',
    releaseDate: '2025-09-29',
  },
  'claude-haiku-4-5': {
    name: 'Claude Haiku 4.5',
    shortName: 'Haiku 4.5',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 64000 },
    knowledgeCutoff: '2025-02-28',
    releaseDate: '2025-10-15',
  },
  'claude-4-opus': {
    name: 'Claude Opus 4',
    shortName: 'Opus 4',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 32000 },
    knowledgeCutoff: '2025-03-31',
    releaseDate: '2025-05-22',
  },
  'claude-4.1-opus': {
    name: 'Claude Opus 4.1',
    shortName: 'Opus 4.1',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 32000 },
    knowledgeCutoff: '2025-03-31',
    releaseDate: '2025-08-05',
  },
  'claude-4-sonnet': {
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet 4',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 64000 },
    knowledgeCutoff: '2025-03-31',
    releaseDate: '2025-05-22',
  },
  'claude-3-7-sonnet': {
    name: 'Claude Sonnet 3.7',
    shortName: 'Sonnet 3.7',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 64000 },
    knowledgeCutoff: '2024-10-31',
    releaseDate: '2025-02-19',
  },
  'claude-3-5-sonnet': {
    name: 'Claude Sonnet 3.5 v2',
    shortName: 'Sonnet 3.5',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 200000, output: 8192 },
    knowledgeCutoff: '2024-04-30',
    releaseDate: '2024-10-22',
  },

  // ============================================
  // Google Gemini 模型
  // ============================================
  'gemini-2.5-pro': {
    name: 'Gemini 2.5 Pro',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    limits: { context: 1048576, output: 65536 },
    knowledgeCutoff: '2025-01',
    releaseDate: '2025-03-20',
  },
  'gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    limits: { context: 1048576, output: 65536 },
    knowledgeCutoff: '2025-01',
    releaseDate: '2025-03-20',
  },
  'gemini-2.5-flash-lite': {
    name: 'Gemini 2.5 Flash Lite',
    shortName: 'Flash Lite',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    limits: { context: 65536, output: 65536 },
    knowledgeCutoff: '2025-01',
    releaseDate: '2025-06-17',
  },
  'gemini-3-pro-preview': {
    name: 'Gemini 3 Pro Preview',
    shortName: 'Gemini 3 Pro',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image', 'audio', 'video', 'pdf'],
      output: ['text'],
    },
    limits: { context: 200000, output: 65536 },
    knowledgeCutoff: '2025-01',
    releaseDate: '2025-01-01',
  },

  // ============================================
  // DeepSeek 模型
  // ============================================
  'deepseek-v3': {
    name: 'DeepSeek V3',
    shortName: 'DeepSeek V3',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 128000, output: 8192 },
    knowledgeCutoff: '2024-06',
    releaseDate: '2025-03-24',
  },
  'deepseek-v3.1': {
    name: 'DeepSeek V3.1',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 163840, output: 163840 },
    knowledgeCutoff: '2025-07',
    releaseDate: '2025-08-21',
  },
  'deepseek-v3.2-exp': {
    name: 'DeepSeek V3.2 Exp',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 65536 },
    knowledgeCutoff: '2025-09',
    releaseDate: '2025-09-29',
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    shortName: 'DeepSeek R1',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 65536, output: 8192 },
    knowledgeCutoff: '2024-06',
    releaseDate: '2025-05-28',
  },

  // ============================================
  // xAI Grok 模型
  // ============================================
  'grok-4': {
    name: 'Grok 4',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 256000, output: 64000 },
    knowledgeCutoff: '2025-07',
    releaseDate: '2025-07-09',
  },
  'grok-4-fast': {
    name: 'Grok 4 Fast',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 2000000, output: 2000000 },
    knowledgeCutoff: '2024-11',
    releaseDate: '2025-08-19',
  },
  'grok-4.1-fast': {
    name: 'Grok 4.1 Fast',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 2000000, output: 2000000 },
    knowledgeCutoff: '2025-10',
    releaseDate: '2025-11-19',
  },
  'grok-code-fast-1': {
    name: 'Grok Code Fast 1',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 256000, output: 32000 },
    knowledgeCutoff: '2025-08',
    releaseDate: '2025-08-20',
  },

  // ============================================
  // Moonshot Kimi 模型
  // ============================================
  'kimi-k2': {
    name: 'Kimi K2',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 16384 },
    knowledgeCutoff: '2024-10',
    releaseDate: '2025-07-11',
  },
  'kimi-k2-turbo': {
    name: 'Kimi K2 Turbo',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 16384 },
    knowledgeCutoff: '2024-10',
    releaseDate: '2025-07-14',
  },
  'kimi-k2-0905': {
    name: 'Kimi K2 Instruct 0905',
    shortName: 'Kimi K2 0905',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 16384 },
    knowledgeCutoff: '2024-10',
    releaseDate: '2025-09-05',
  },
  'kimi-k2-thinking': {
    name: 'Kimi K2 Thinking',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 262144 },
    knowledgeCutoff: '2024-08',
    releaseDate: '2025-11-06',
  },
  'kimi-k2-thinking-turbo': {
    name: 'Kimi K2 Thinking Turbo',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 262144 },
    knowledgeCutoff: '2024-08',
    releaseDate: '2025-11-06',
  },

  // ============================================
  // 智谱 GLM 模型
  // ============================================
  'glm-4.6': {
    name: 'GLM-4.6',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 204800, output: 131072 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-09-30',
  },
  'glm-4.5': {
    name: 'GLM-4.5',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 98304 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-07-28',
  },
  'glm-4.5-air': {
    name: 'GLM-4.5 Air',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 98304 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-07-28',
  },
  'glm-4.5-flash': {
    name: 'GLM-4.5 Flash',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 131072, output: 98304 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-07-28',
  },
  'glm-4.5v': {
    name: 'GLM-4.5V',
    category: 'chat',
    capabilities: {
      attachment: true,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text', 'image', 'video'],
      output: ['text'],
    },
    limits: { context: 64000, output: 16384 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-08-11',
  },

  // ============================================
  // Qwen 模型
  // ============================================
  'qwen3-coder': {
    name: 'Qwen3 Coder 480B',
    shortName: 'Qwen3 Coder',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 66536 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-07-23',
  },
  'qwen3-coder-plus': {
    name: 'Qwen3 Coder Plus',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: false,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 1048576, output: 65536 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-07-23',
  },
  'qwen3-235b': {
    name: 'Qwen3 235B A22B Instruct',
    shortName: 'Qwen3 235B',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 131072 },
    knowledgeCutoff: '2025-04',
    releaseDate: '2025-04-28',
  },
  'qwen3-max': {
    name: 'Qwen3 Max',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: false,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 262144, output: 32768 },
    knowledgeCutoff: '2025-09',
    releaseDate: '2025-09-05',
  },

  // ============================================
  // 其他模型
  // ============================================
  'minimax-m2': {
    name: 'Minimax M2',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    limits: { context: 196608, output: 64000 },
    releaseDate: '2025-10-27',
  },
  'doubao-seed-1.6': {
    name: 'Doubao Seed 1.6',
    category: 'chat',
    capabilities: {
      attachment: false,
      reasoning: true,
      temperature: true,
      toolCall: true,
      openWeights: true,
    },
    modalities: {
      input: ['text', 'image'],
      output: ['text'],
    },
    limits: { context: 163840, output: 163840 },
    knowledgeCutoff: '2025-01',
    releaseDate: '2025-06-11',
  },
}

/**
 * 获取模型的完整信息（包含 id）
 */
export function getModelById(id: string) {
  const model = modelRegistry[id]
  if (!model) return null
  return { id, ...model }
}

/**
 * 获取所有模型 ID 列表
 */
export function getAllModelIds(): string[] {
  return Object.keys(modelRegistry)
}

/**
 * 根据分类筛选模型
 */
export function getModelsByCategory(category: string): string[] {
  return Object.entries(modelRegistry)
    .filter(([, model]) => model.category === category)
    .map(([id]) => id)
}

/** 默认 context window 大小（用于未知模型） */
const DEFAULT_CONTEXT_WINDOW = 128000

/**
 * 获取模型的 context window 大小
 * @param modelId 模型 ID
 * @returns context window token 数量，未知模型返回默认值
 */
export function getModelContextWindow(modelId: string | null | undefined): number {
  if (!modelId) return DEFAULT_CONTEXT_WINDOW
  const model = modelRegistry[modelId]
  return model?.limits?.context ?? DEFAULT_CONTEXT_WINDOW
}
