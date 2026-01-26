/**
 * [PROVIDES]: LLM 默认模型、预设 Provider 配置
 * [POS]: Anyhunt LLM 模块常量入口（对齐 Moryflow）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

export const ANYHUNT_LLM_SECRET_KEY_ENV = 'ANYHUNT_LLM_SECRET_KEY';

export const DEFAULT_LLM_SETTINGS_ID = 'default' as const;
export const DEFAULT_LLM_AGENT_MODEL_ID = 'gpt-4o';
export const DEFAULT_LLM_EXTRACT_MODEL_ID = 'gpt-4o-mini';

export const PRESET_LLM_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    sdkType: 'openai',
    defaultBaseUrl: 'https://api.openai.com/v1',
    docUrl: 'https://platform.openai.com/docs/api-reference',
    description: 'GPT-4, GPT-3.5 等模型',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    sdkType: 'anthropic',
    defaultBaseUrl: 'https://api.anthropic.com',
    docUrl: 'https://docs.anthropic.com/claude/reference',
    description: 'Claude 3.5, Claude 3 等模型',
  },
  {
    id: 'google',
    name: 'Google AI',
    sdkType: 'google',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    docUrl:
      'https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini',
    description: 'Gemini Pro, Gemini Ultra 等模型',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    sdkType: 'openrouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    docUrl: 'https://openrouter.ai/docs',
    description: '多模型聚合平台，支持深度推理',
  },
  {
    id: 'zenmux',
    name: 'zenmux.ai',
    sdkType: 'openai-compatible',
    defaultBaseUrl: 'https://zenmux.ai/api/v1',
    docUrl: 'https://zenmux.ai',
    description: '多模型聚合平台',
  },
] as const;
