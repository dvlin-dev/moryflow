export interface SearchResult {
  id: string
  content: string
  score: number
  createdAt: string
  tags?: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  searchTime: number
  totalFound: number
}

interface BackendResponse {
  success: boolean
  results?: SearchResult[]
  searchTimeMs?: number
  totalFound?: number
  error?: {
    code: string
    message: string
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 搜索记忆
 * @param query 搜索查询
 * @param captcha Turnstile 验证码 token
 * @param apiUrl API 基础地址
 */
export async function searchMemories(
  query: string,
  captcha: string,
  apiUrl: string
): Promise<SearchResponse> {
  const response = await fetch(`${apiUrl}/api/demo/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, captcha }),
  })

  const data: BackendResponse = await response.json()

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || 'Failed to search memories',
      data.error?.code
    )
  }

  return {
    results: data.results || [],
    searchTime: data.searchTimeMs || 0,
    totalFound: data.totalFound || 0,
  }
}
