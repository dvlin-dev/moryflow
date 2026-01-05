/**
 * [INPUT]: UpstreamModel - LiteLLM 原始数据
 * [OUTPUT]: ModelInfo - 转换后的模型信息
 * [POS]: 数据转换层，负责格式标准化
 */

import type { ModelInfo, UpstreamModel } from './types'

/**
 * 服务商名称映射
 */
export const PROVIDER_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  azure: 'Azure OpenAI',
  azure_ai: 'Azure AI',
  bedrock: 'AWS Bedrock',
  bedrock_converse: 'AWS Bedrock',
  vertex_ai: 'Google Vertex AI',
  vertex_ai_beta: 'Google Vertex AI',
  cohere: 'Cohere',
  cohere_chat: 'Cohere',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  mistral: 'Mistral',
  together_ai: 'Together AI',
  openrouter: 'OpenRouter',
  fireworks_ai: 'Fireworks',
  anyscale: 'Anyscale',
  replicate: 'Replicate',
  ollama: 'Ollama',
  xai: 'xAI',
  moonshot: 'Moonshot',
  zhipu: 'Zhipu',
  baichuan: 'Baichuan',
  minimax: 'MiniMax',
  doubao: 'Doubao',
  qwen: 'Qwen',
  aiml: 'AI/ML',
  assemblyai: 'AssemblyAI',
  voyage: 'Voyage',
  perplexity: 'Perplexity',
  sambanova: 'SambaNova',
  cerebras: 'Cerebras',
  ai21: 'AI21',
  nlp_cloud: 'NLP Cloud',
  aleph_alpha: 'Aleph Alpha',
  palm: 'Google PaLM',
  cloudflare: 'Cloudflare',
  text_completion_codestral: 'Mistral Codestral',
  codestral: 'Mistral Codestral',
  sagemaker: 'AWS SageMaker',
  databricks: 'Databricks',
  friendliai: 'FriendliAI',
  github: 'GitHub',
}

/**
 * 从模型 ID 生成显示名称
 */
function generateDisplayName(modelId: string): string {
  // 移除服务商前缀（如 openai/、anthropic/）
  let name = modelId.replace(/^[a-z_-]+\//, '')

  // 移除日期后缀
  name = name.replace(/-\d{4}-\d{2}-\d{2}$/, '')
  name = name.replace(/-\d{8}$/, '')
  name = name.replace(/:[\d.]+$/, '')

  // 常见模型名称保持原样
  const preserveCase = [
    'gpt',
    'o1',
    'o3',
    'claude',
    'gemini',
    'llama',
    'qwen',
    'glm',
    'grok',
    'mistral',
    'mixtral',
    'deepseek',
    'yi',
    'phi',
  ]

  const parts = name.split(/[-_]/).map((part) => {
    const lower = part.toLowerCase()
    if (preserveCase.some((p) => lower.startsWith(p))) {
      return part.toUpperCase()
    }
    if (/^\d+[a-z]*$/.test(part)) {
      return part
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
  })

  return parts.join(' ')
}

/**
 * 转换单个模型数据
 */
export function transformModel(id: string, model: UpstreamModel): ModelInfo {
  const provider = model.litellm_provider || 'unknown'

  return {
    id,
    displayName: generateDisplayName(id),
    provider,
    providerName: PROVIDER_NAMES[provider] || provider,
    mode: model.mode || 'chat',
    maxContextTokens: model.max_input_tokens || model.max_tokens || 4096,
    maxOutputTokens: model.max_output_tokens || model.max_tokens || 4096,
    inputPricePerMillion: (model.input_cost_per_token || 0) * 1_000_000,
    outputPricePerMillion: (model.output_cost_per_token || 0) * 1_000_000,
    capabilities: {
      vision: model.supports_vision || false,
      tools: model.supports_function_calling || false,
      reasoning: model.supports_reasoning || false,
      json: model.supports_response_schema || false,
      audio: model.supports_audio_input || model.supports_audio_output || false,
      pdf: model.supports_pdf_input || false,
    },
    deprecated: !!model.deprecation_date,
    deprecationDate: model.deprecation_date,
  }
}
