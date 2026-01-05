/**
 * Ollama API 客户端
 * 封装与 Ollama 服务的 HTTP 通信
 */

import type {
  OllamaTagsResponse,
  OllamaVersionResponse,
  OllamaPullProgress,
  OllamaShowResponse,
  OllamaConnectionResult,
  OllamaLocalModel,
  OllamaLibraryModel,
  OllamaLibrarySearchParams,
} from './types.js'
import { convertToLocalModel } from './model-capabilities.js'

/** 默认 Ollama API 地址 */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434'

/** OllamaDB API 地址 */
const OLLAMADB_API_URL = 'https://ollamadb.dev/api/v1'

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10_000

/**
 * 创建 AbortSignal 超时
 */
function createTimeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

/**
 * 检测 Ollama 服务连接状态
 */
export async function checkConnection(
  baseUrl = DEFAULT_OLLAMA_BASE_URL
): Promise<OllamaConnectionResult> {
  try {
    const response = await fetch(`${baseUrl}/api/version`, {
      signal: createTimeoutSignal(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      return {
        connected: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = (await response.json()) as OllamaVersionResponse
    return {
      connected: true,
      version: data.version,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 获取本地已安装的模型列表
 */
export async function getLocalModels(
  baseUrl = DEFAULT_OLLAMA_BASE_URL
): Promise<OllamaLocalModel[]> {
  const response = await fetch(`${baseUrl}/api/tags`, {
    signal: createTimeoutSignal(REQUEST_TIMEOUT),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch models: HTTP ${response.status}`)
  }

  const data = (await response.json()) as OllamaTagsResponse
  return data.models.map(convertToLocalModel)
}

/**
 * 下载模型（流式进度）
 * @param name 模型名称（如 "qwen2.5:7b"）
 * @param onProgress 进度回调
 * @param baseUrl Ollama API 地址
 */
export async function pullModel(
  name: string,
  onProgress: (progress: OllamaPullProgress) => void,
  baseUrl = DEFAULT_OLLAMA_BASE_URL
): Promise<void> {
  const response = await fetch(`${baseUrl}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, stream: true }),
  })

  if (!response.ok) {
    throw new Error(`Failed to pull model: HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is empty')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const progress = JSON.parse(line) as OllamaPullProgress
            onProgress(progress)
          } catch {
            // 忽略解析错误的行
          }
        }
      }
    }

    // 处理剩余的 buffer
    if (buffer.trim()) {
      try {
        const progress = JSON.parse(buffer) as OllamaPullProgress
        onProgress(progress)
      } catch {
        // 忽略
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 删除本地模型
 */
export async function deleteModel(name: string, baseUrl = DEFAULT_OLLAMA_BASE_URL): Promise<void> {
  const response = await fetch(`${baseUrl}/api/delete`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!response.ok) {
    throw new Error(`Failed to delete model: HTTP ${response.status}`)
  }
}

/**
 * 获取模型详情
 */
export async function showModel(
  name: string,
  baseUrl = DEFAULT_OLLAMA_BASE_URL
): Promise<OllamaShowResponse> {
  const response = await fetch(`${baseUrl}/api/show`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    signal: createTimeoutSignal(REQUEST_TIMEOUT),
  })

  if (!response.ok) {
    throw new Error(`Failed to show model: HTTP ${response.status}`)
  }

  return (await response.json()) as OllamaShowResponse
}

/** 默认热门模型列表（当 API 不可用时的 fallback） */
const DEFAULT_LIBRARY_MODELS: OllamaLibraryModel[] = [
  {
    model_identifier: 'qwen3-vl',
    namespace: 'library',
    name: 'qwen3-vl',
    description: '通义千问 3 视觉语言模型，支持图片/视频理解、GUI 交互、256K 上下文',
    pulls: 550400,
    tag_count: 8,
    last_updated: '2025-05-01',
    capabilities: ['vision', 'tools'],
    sizes: ['2b', '4b', '8b', '30b', '32b', '235b'],
  },
  {
    model_identifier: 'qwen3',
    namespace: 'library',
    name: 'qwen3',
    description: '通义千问 3，支持工具调用和深度思考，100+ 语言',
    pulls: 14000000,
    tag_count: 8,
    last_updated: '2025-05-01',
    capabilities: ['tools', 'thinking'],
    sizes: ['0.6b', '1.7b', '4b', '8b', '14b', '30b', '32b', '235b'],
  },
  {
    model_identifier: 'deepseek-v3',
    namespace: 'library',
    name: 'deepseek-v3',
    description: 'DeepSeek V3 MoE 模型，671B 参数，160K 上下文',
    pulls: 2800000,
    tag_count: 2,
    last_updated: '2025-05-01',
    capabilities: ['tools'],
    sizes: ['671b'],
  },
  {
    model_identifier: 'gpt-oss',
    namespace: 'library',
    name: 'gpt-oss',
    description: 'OpenAI 开源推理模型，支持工具调用和深度思考，128K 上下文',
    pulls: 4800000,
    tag_count: 4,
    last_updated: '2025-05-01',
    capabilities: ['tools', 'thinking'],
    sizes: ['20b', '120b'],
  },
  {
    model_identifier: 'kimi-k2',
    namespace: 'library',
    name: 'kimi-k2',
    description: 'Kimi K2 MoE 模型，1T 参数，256K 上下文，增强编码能力',
    pulls: 17000,
    tag_count: 1,
    last_updated: '2025-05-01',
    capabilities: ['tools'],
    sizes: ['1t-cloud'],
  },
  {
    model_identifier: 'gemini-3-pro-preview',
    namespace: 'library',
    name: 'gemini-3-pro-preview',
    description: 'Google Gemini 3 Pro，支持文本/图片/音频/视频，1M 上下文',
    pulls: 16600,
    tag_count: 1,
    last_updated: '2025-05-01',
    capabilities: ['vision', 'tools'],
    sizes: ['latest'],
  },
  {
    model_identifier: 'deepseek-r1',
    namespace: 'library',
    name: 'deepseek-r1',
    description: 'DeepSeek 推理模型，接近 O3 和 Gemini 2.5 Pro 性能',
    pulls: 72800000,
    tag_count: 7,
    last_updated: '2025-05-01',
    capabilities: ['tools', 'thinking'],
    sizes: ['1.5b', '7b', '8b', '14b', '32b', '70b', '671b'],
  },
  {
    model_identifier: 'gemma3',
    namespace: 'library',
    name: 'gemma3',
    description: 'Google Gemma 3，轻量级多模态模型，128K 上下文，140+ 语言',
    pulls: 26900000,
    tag_count: 5,
    last_updated: '2025-05-01',
    capabilities: ['vision', 'tools'],
    sizes: ['1b', '4b', '12b', '27b'],
  },
]

/**
 * 从 OllamaDB API 获取模型库列表
 */
export async function getLibraryModels(
  params: OllamaLibrarySearchParams = {}
): Promise<OllamaLibraryModel[]> {
  const { search, capability, sortBy = 'pulls', order = 'desc', limit = 20 } = params

  try {
    const url = new URL(`${OLLAMADB_API_URL}/models`)
    if (search) url.searchParams.set('search', search)
    if (capability) url.searchParams.set('capability', capability)
    url.searchParams.set('sort_by', sortBy)
    url.searchParams.set('order', order)
    url.searchParams.set('limit', String(limit))

    const response = await fetch(url.toString(), {
      signal: createTimeoutSignal(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      console.warn(`[ollama] Library API returned ${response.status}, using fallback`)
      return filterDefaultModels(params)
    }

    const data = (await response.json()) as OllamaLibraryModel[]
    return data
  } catch (error) {
    console.warn('[ollama] Failed to fetch library models, using fallback:', error)
    return filterDefaultModels(params)
  }
}

/** 过滤默认模型列表 */
function filterDefaultModels(params: OllamaLibrarySearchParams): OllamaLibraryModel[] {
  let models = [...DEFAULT_LIBRARY_MODELS]

  // 搜索过滤
  if (params.search) {
    const query = params.search.toLowerCase()
    models = models.filter(
      (m) => m.name.toLowerCase().includes(query) || m.description.toLowerCase().includes(query)
    )
  }

  // 能力过滤
  if (params.capability) {
    models = models.filter((m) => m.capabilities.includes(params.capability!))
  }

  // 排序
  const sortBy = params.sortBy || 'pulls'
  const order = params.order || 'desc'
  models.sort((a, b) => {
    const aVal = sortBy === 'pulls' ? a.pulls : new Date(a.last_updated).getTime()
    const bVal = sortBy === 'pulls' ? b.pulls : new Date(b.last_updated).getTime()
    return order === 'desc' ? bVal - aVal : aVal - bVal
  })

  // 限制数量
  const limit = params.limit || 20
  return models.slice(0, limit)
}
