/**
 * 预设服务商注册表
 * 包含所有主流 AI 服务商的配置
 */

import type { ProviderRegistry } from './types';

/**
 * 服务商注册表
 * 按照使用频率排序（sortOrder 越大越靠前）
 */
export const providerRegistry: ProviderRegistry = {
  // ============================================
  // 主流服务商
  // ============================================
  openai: {
    id: 'openai',
    name: 'OpenAI',
    icon: 'openai',
    docUrl: 'https://platform.openai.com/docs/models',
    defaultBaseUrl: 'https://api.openai.com/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 100,
    modelIds: [
      'gpt-5.1',
      'gpt-5.1-codex',
      'gpt-5.1-codex-mini',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-codex',
      'gpt-4.1',
      'gpt-4o',
      'o3',
      'o3-pro',
      'o3-mini',
      'o4-mini',
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    icon: 'anthropic',
    docUrl: 'https://docs.anthropic.com/en/docs/models',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    authType: 'api-key',
    sdkType: 'anthropic',
    sortOrder: 95,
    modelIds: [
      'claude-opus-4-5',
      'claude-4-5-sonnet',
      'claude-haiku-4-5',
      'claude-4.1-opus',
      'claude-4-opus',
      'claude-4-sonnet',
      'claude-3-7-sonnet',
      'claude-3-5-sonnet',
    ],
    modelIdMapping: {
      'claude-opus-4-5-20251124': 'claude-opus-4-5',
      'claude-sonnet-4-5-20250929': 'claude-4-5-sonnet',
      'claude-opus-4-1-20250805': 'claude-4.1-opus',
      'claude-opus-4-20250514': 'claude-4-opus',
      'claude-sonnet-4-20250514': 'claude-4-sonnet',
      'claude-3-7-sonnet-20250219': 'claude-3-7-sonnet',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet',
    },
  },

  google: {
    id: 'google',
    name: 'Google',
    icon: 'google',
    docUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authType: 'api-key',
    sdkType: 'google',
    sortOrder: 90,
    modelIds: [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-pro-preview',
    ],
    modelIdMapping: {
      'gemini-2.5-flash-lite-preview-06-17': 'gemini-2.5-flash-lite',
    },
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: 'deepseek',
    docUrl: 'https://platform.deepseek.com/api-docs/pricing',
    defaultBaseUrl: 'https://api.deepseek.com',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 85,
    modelIds: ['deepseek-v3', 'deepseek-v3.1', 'deepseek-v3.2-exp', 'deepseek-r1'],
    modelIdMapping: {
      'deepseek-chat': 'deepseek-v3.2-exp',
      'deepseek-reasoner': 'deepseek-r1',
    },
  },

  xai: {
    id: 'xai',
    name: 'xAI',
    icon: 'xai',
    docUrl: 'https://xai.com/docs/models',
    defaultBaseUrl: 'https://api.x.ai/v1',
    authType: 'api-key',
    sdkType: 'xai',
    sortOrder: 80,
    modelIds: ['grok-4', 'grok-4-fast', 'grok-4.1-fast', 'grok-code-fast-1'],
    modelIdMapping: {
      'grok-4-1-fast': 'grok-4.1-fast',
    },
  },

  // ============================================
  // 本地服务商
  // ============================================
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    icon: 'ollama',
    docUrl: 'https://ollama.com/library',
    defaultBaseUrl: 'http://localhost:11434/v1',
    authType: 'none',
    sdkType: 'openai-compatible',
    sortOrder: 78,
    modelIds: [],
    allowCustomModels: true,
    description: '本地运行的开源模型',
    localBackend: 'ollama',
    nativeApiBaseUrl: 'http://localhost:11434',
    hidden: true, // TODO: 完善后开放
  },

  // ============================================
  // 聚合服务商
  // ============================================
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    icon: 'openrouter',
    docUrl: 'https://openrouter.ai/docs/models',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    authType: 'api-key',
    sdkType: 'openrouter',
    sortOrder: 75,
    allowCustomModels: true,
    description: '聚合多家模型服务商，按使用量计费',
    modelIds: [
      'claude-opus-4-5',
      'claude-4-5-sonnet',
      'claude-haiku-4-5',
      'claude-4.1-opus',
      'claude-4-opus',
      'gpt-5.1',
      'gpt-5',
      'gpt-5-mini',
      'o3',
      'o3-pro',
      'o4-mini',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-3-pro-preview',
      'deepseek-v3',
      'deepseek-v3.1',
      'deepseek-r1',
      'grok-4',
      'grok-4-fast',
      'grok-4.1-fast',
      'kimi-k2',
      'kimi-k2-0905',
      'kimi-k2-thinking',
      'glm-4.5',
      'glm-4.6',
      'qwen3-coder',
      'qwen3-max',
      'minimax-m2',
    ],
    modelIdMapping: {
      'anthropic/claude-opus-4.5': 'claude-opus-4-5',
      'anthropic/claude-sonnet-4.5': 'claude-4-5-sonnet',
      'anthropic/claude-haiku-4.5': 'claude-haiku-4-5',
      'anthropic/claude-opus-4.1': 'claude-4.1-opus',
      'anthropic/claude-opus-4': 'claude-4-opus',
      'openai/gpt-5.1': 'gpt-5.1',
      'openai/gpt-5': 'gpt-5',
      'openai/gpt-5-mini': 'gpt-5-mini',
      'openai/o3': 'o3',
      'openai/o3-pro': 'o3-pro',
      'openai/o4-mini': 'o4-mini',
      'google/gemini-2.5-pro': 'gemini-2.5-pro',
      'google/gemini-2.5-flash': 'gemini-2.5-flash',
      'google/gemini-3-pro-preview': 'gemini-3-pro-preview',
      'deepseek/deepseek-chat-v3-0324': 'deepseek-v3',
      'deepseek/deepseek-chat-v3.1': 'deepseek-v3.1',
      'deepseek/deepseek-r1-0528': 'deepseek-r1',
      'x-ai/grok-4': 'grok-4',
      'x-ai/grok-4-fast': 'grok-4-fast',
      'x-ai/grok-4.1-fast': 'grok-4.1-fast',
      'moonshotai/kimi-k2': 'kimi-k2',
      'moonshotai/kimi-k2-0905': 'kimi-k2-0905',
      'moonshotai/kimi-k2-thinking': 'kimi-k2-thinking',
      'z-ai/glm-4.5': 'glm-4.5',
      'z-ai/glm-4.6': 'glm-4.6',
      'qwen/qwen3-coder': 'qwen3-coder',
      'qwen/qwen3-max': 'qwen3-max',
      'minimax/minimax-m2': 'minimax-m2',
    },
  },

  aihubmix: {
    id: 'aihubmix',
    name: 'AIHubMix',
    icon: 'aihubmix',
    docUrl: 'https://docs.aihubmix.com/',
    defaultBaseUrl: 'https://aihubmix.com/v1',
    authType: 'api-key',
    sdkType: 'openai-compatible',
    sortOrder: 70,
    allowCustomModels: true,
    description: '国内聚合服务，支持多家模型',
    modelIds: [
      'claude-opus-4-5',
      'claude-4-5-sonnet',
      'claude-4.1-opus',
      'claude-4-opus',
      'claude-4-sonnet',
      'claude-3-7-sonnet',
      'claude-3-5-sonnet',
      'gpt-5',
      'gpt-5-mini',
      'gpt-4.1',
      'gpt-4o',
      'o3',
      'o3-mini',
      'o4-mini',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'deepseek-r1',
      'deepseek-v3',
      'glm-4.6',
      'kimi-k2-thinking',
      'kimi-k2-turbo',
    ],
    modelIdMapping: {
      'claude-opus-4-1': 'claude-4.1-opus',
      'claude-sonnet-4-5': 'claude-4-5-sonnet',
      'claude-opus-4-20250514': 'claude-4-opus',
      'claude-sonnet-4-20250514': 'claude-4-sonnet',
      'claude-3-7-sonnet-20250219': 'claude-3-7-sonnet',
      'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet',
      'DeepSeek-R1': 'deepseek-r1',
      'DeepSeek-V3': 'deepseek-v3',
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
      'kimi-k2-turbo-preview': 'kimi-k2-turbo',
    },
  },

  // ============================================
  // Moonshot（国内/国际版）
  // ============================================
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot',
    icon: 'moonshot',
    docUrl: 'https://platform.moonshot.ai/docs/api/chat',
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 65,
    modelIds: [
      'kimi-k2',
      'kimi-k2-turbo',
      'kimi-k2-0905',
      'kimi-k2-thinking',
      'kimi-k2-thinking-turbo',
    ],
    modelIdMapping: {
      'kimi-k2-0711-preview': 'kimi-k2',
      'kimi-k2-0905-preview': 'kimi-k2-0905',
      'kimi-k2-turbo-preview': 'kimi-k2-turbo',
    },
  },

  'moonshot-cn': {
    id: 'moonshot-cn',
    name: 'Moonshot CN',
    icon: 'moonshot',
    docUrl: 'https://platform.moonshot.cn/docs/api/chat',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 64,
    description: 'Moonshot 国内版',
    modelIds: [
      'kimi-k2',
      'kimi-k2-turbo',
      'kimi-k2-0905',
      'kimi-k2-thinking',
      'kimi-k2-thinking-turbo',
    ],
    modelIdMapping: {
      'kimi-k2-0711-preview': 'kimi-k2',
      'kimi-k2-0905-preview': 'kimi-k2-0905',
      'kimi-k2-turbo-preview': 'kimi-k2-turbo',
    },
  },

  // ============================================
  // SiliconFlow（国内/国际版）
  // ============================================
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    icon: 'siliconflow',
    docUrl: 'https://docs.siliconflow.com',
    defaultBaseUrl: 'https://api.siliconflow.com/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 60,
    allowCustomModels: true,
    description: '开源模型托管平台',
    modelIds: [
      'qwen3-235b',
      'qwen3-coder',
      'kimi-k2',
      'kimi-k2-0905',
      'deepseek-r1',
      'deepseek-v3.1',
      'deepseek-v3',
      'glm-4.5',
    ],
    modelIdMapping: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': 'qwen3-235b',
      'Qwen/Qwen3-Coder-480B-A35B-Instruct': 'qwen3-coder',
      'moonshotai/Kimi-K2-Instruct-0905': 'kimi-k2-0905',
      'moonshotai/Kimi-K2-Instruct': 'kimi-k2',
      'deepseek-ai/DeepSeek-R1': 'deepseek-r1',
      'deepseek-ai/DeepSeek-V3.1': 'deepseek-v3.1',
      'deepseek-ai/DeepSeek-V3': 'deepseek-v3',
      'zai-org/GLM-4.5': 'glm-4.5',
    },
  },

  'siliconflow-cn': {
    id: 'siliconflow-cn',
    name: 'SiliconFlow CN',
    icon: 'siliconflow',
    docUrl: 'https://docs.siliconflow.cn',
    defaultBaseUrl: 'https://api.siliconflow.cn/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 59,
    allowCustomModels: true,
    description: 'SiliconFlow 国内版',
    modelIds: [
      'qwen3-235b',
      'qwen3-coder',
      'kimi-k2',
      'kimi-k2-0905',
      'deepseek-r1',
      'deepseek-v3.1',
      'deepseek-v3',
      'glm-4.5',
    ],
    modelIdMapping: {
      'Qwen/Qwen3-235B-A22B-Instruct-2507': 'qwen3-235b',
      'Qwen/Qwen3-Coder-480B-A35B-Instruct': 'qwen3-coder',
      'moonshotai/Kimi-K2-Instruct-0905': 'kimi-k2-0905',
      'moonshotai/Kimi-K2-Instruct': 'kimi-k2',
      'deepseek-ai/DeepSeek-R1': 'deepseek-r1',
      'deepseek-ai/DeepSeek-V3.1': 'deepseek-v3.1',
      'deepseek-ai/DeepSeek-V3': 'deepseek-v3',
      'zai-org/GLM-4.5': 'glm-4.5',
    },
  },

  // ============================================
  // 智谱 AI
  // ============================================
  zhipuai: {
    id: 'zhipuai',
    name: '智谱 AI',
    icon: 'zhipuai',
    docUrl: 'https://docs.z.ai/guides/overview/pricing',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 55,
    modelIds: ['glm-4.6', 'glm-4.5', 'glm-4.5-air', 'glm-4.5-flash', 'glm-4.5v'],
  },

  // ============================================
  // 火山引擎
  // ============================================
  volcengine: {
    id: 'volcengine',
    name: '火山引擎',
    icon: 'volcengine',
    docUrl: 'https://www.volcengine.com/docs/82379/1330310',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 50,
    modelIds: ['deepseek-v3.1', 'doubao-seed-1.6', 'kimi-k2-0905'],
    modelIdMapping: {
      'deepseek-v3-1-250821': 'deepseek-v3.1',
      'doubao-seed-1-6-250615': 'doubao-seed-1.6',
      'kimi-k2-250905': 'kimi-k2-0905',
    },
  },

  // ============================================
  // ModelScope
  // ============================================
  modelscope: {
    id: 'modelscope',
    name: 'ModelScope',
    icon: 'modelscope',
    docUrl: 'https://modelscope.cn/docs/model-service/API-Inference/intro',
    defaultBaseUrl: 'https://api-inference.modelscope.cn/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 45,
    description: '阿里云模型服务',
    modelIds: ['qwen3-coder', 'qwen3-235b', 'glm-4.5', 'glm-4.5v', 'glm-4.6'],
    modelIdMapping: {
      'Qwen/Qwen3-Coder-480B-A35B-Instruct': 'qwen3-coder',
      'Qwen/Qwen3-235B-A22B-Instruct-2507': 'qwen3-235b',
      'ZhipuAI/GLM-4.5': 'glm-4.5',
      'ZhipuAI/GLM-4.5V': 'glm-4.5v',
      'ZhipuAI/GLM-4.6': 'glm-4.6',
    },
  },

  // ============================================
  // Groq
  // ============================================
  groq: {
    id: 'groq',
    name: 'Groq',
    icon: 'groq',
    docUrl: 'https://console.groq.com/docs/models',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    authType: 'api-key',
    sdkType: 'openai',
    sortOrder: 40,
    allowCustomModels: true,
    description: '超快推理服务',
    modelIds: [],
  },

  // ============================================
  // Cerebras
  // ============================================
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    icon: 'cerebras',
    docUrl: 'https://cerebras.ai/docs',
    defaultBaseUrl: 'https://api.cerebras.ai/v1',
    authType: 'api-key',
    sdkType: 'openai-compatible',
    sortOrder: 35,
    modelIds: ['glm-4.6'],
    modelIdMapping: {
      'zai-glm-4.6': 'glm-4.6',
    },
  },

  // ============================================
  // Minimax
  // ============================================
  minimax: {
    id: 'minimax',
    name: 'Minimax',
    icon: 'minimax',
    docUrl: 'https://platform.minimaxi.com/docs/guides/quickstart',
    defaultBaseUrl: 'https://api.minimaxi.com/anthropic/v1',
    authType: 'api-key',
    sdkType: 'anthropic',
    sortOrder: 30,
    modelIds: ['minimax-m2'],
  },

  // ============================================
  // GitHub Copilot (OAuth)
  // ============================================
  'github-copilot': {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    icon: 'github',
    docUrl: 'https://github.com/settings/copilot/features',
    defaultBaseUrl: 'https://api.githubcopilot.com',
    authType: 'oauth',
    sdkType: 'openai',
    sortOrder: 20,
    description: '需要 GitHub Copilot 订阅',
    modelIds: [
      'claude-opus-4-5',
      'claude-4-5-sonnet',
      'claude-4.1-opus',
      'claude-4-opus',
      'claude-3-7-sonnet',
      'claude-3-5-sonnet',
      'gpt-5.1',
      'gpt-5.1-codex',
      'gpt-5.1-codex-mini',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-codex',
      'gpt-4.1',
      'gpt-4o',
      'o3',
      'o3-mini',
      'o4-mini',
      'gemini-2.5-pro',
      'gemini-3-pro-preview',
      'grok-code-fast-1',
    ],
    modelIdMapping: {
      'claude-opus-4': 'claude-4-opus',
      'claude-opus-41': 'claude-4.1-opus',
      'claude-sonnet-4': 'claude-4-sonnet',
      'claude-sonnet-4.5': 'claude-4-5-sonnet',
      'claude-opus-4-5': 'claude-opus-4-5',
      'claude-3.5-sonnet': 'claude-3-5-sonnet',
      'claude-3.7-sonnet': 'claude-3-7-sonnet',
    },
  },
};

/**
 * 获取服务商列表（按 sortOrder 排序，排除隐藏的服务商）
 */
export function getSortedProviders(): (typeof providerRegistry)[string][] {
  return Object.values(providerRegistry)
    .filter((p) => !p.hidden)
    .sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
}

/**
 * 获取服务商 ID 列表
 */
export function getAllProviderIds(): string[] {
  return Object.keys(providerRegistry);
}

/**
 * 获取服务商
 */
export function getProviderById(id: string) {
  return providerRegistry[id] ?? null;
}

/**
 * 获取服务商支持的模型 ID 列表
 * 返回的是 API 调用时使用的实际模型 ID
 */
export function getProviderModelApiIds(providerId: string): string[] {
  const provider = providerRegistry[providerId];
  if (!provider) return [];

  // 如果有映射，返回映射的 key（API 使用的 ID）
  if (provider.modelIdMapping) {
    return Object.keys(provider.modelIdMapping);
  }

  // 否则直接返回 modelIds（API ID 和标准 ID 相同）
  return provider.modelIds;
}

/**
 * 将服务商特定的模型 ID 转换为标准模型 ID
 */
export function normalizeModelId(providerId: string, apiModelId: string): string {
  const provider = providerRegistry[providerId];
  if (!provider) return apiModelId;

  // 检查映射
  if (provider.modelIdMapping?.[apiModelId]) {
    return provider.modelIdMapping[apiModelId];
  }

  // 如果在 modelIds 中直接存在，说明没有映射
  if (provider.modelIds.includes(apiModelId)) {
    return apiModelId;
  }

  return apiModelId;
}

/**
 * 将标准模型 ID 转换为服务商特定的 API 模型 ID
 */
export function toApiModelId(providerId: string, standardModelId: string): string {
  const provider = providerRegistry[providerId];
  if (!provider) return standardModelId;

  // 检查反向映射
  if (provider.modelIdMapping) {
    for (const [apiId, stdId] of Object.entries(provider.modelIdMapping)) {
      if (stdId === standardModelId) {
        return apiId;
      }
    }
  }

  // 如果在 modelIds 中直接存在，说明没有映射
  if (provider.modelIds.includes(standardModelId)) {
    return standardModelId;
  }

  return standardModelId;
}
