import { Hono } from 'hono'
import type {
  Env,
  UpsertRequest,
  UpsertResponse,
  QueryRequest,
  QueryResponse,
  DeleteRequest,
  DeleteResponse,
  ErrorResponse,
} from '../types'

const vectors = new Hono<{ Bindings: Env }>()

/**
 * 插入/更新向量
 * POST /vectors/upsert
 *
 * 自动生成文本的向量嵌入并存储
 */
vectors.post('/upsert', async (c) => {
  const body = await c.req.json<UpsertRequest>()
  const { vectors: inputVectors } = body

  // 参数校验
  if (!inputVectors || !Array.isArray(inputVectors) || inputVectors.length === 0) {
    return c.json<ErrorResponse>({ error: 'vectors 必须是非空数组' }, 400)
  }

  if (inputVectors.length > 32) {
    return c.json<ErrorResponse>({ error: '单次最多处理 32 条向量' }, 400)
  }

  // 校验每条向量
  for (const v of inputVectors) {
    if (!v.id || typeof v.id !== 'string') {
      return c.json<ErrorResponse>({ error: '每条向量必须有 id' }, 400)
    }
    if (!v.text || typeof v.text !== 'string' || v.text.trim() === '') {
      return c.json<ErrorResponse>({ error: '每条向量必须有 text' }, 400)
    }
  }

  try {
    // 批量生成向量
    const texts = inputVectors.map((v) => v.text)
    const embedResult = await c.env.AI.run('@cf/qwen/qwen3-embedding-0.6b', { text: texts })

    if (!embedResult.data) {
      throw new Error('AI 返回结果无效')
    }

    // 构建 Vectorize 向量
    const vectorizeVectors: VectorizeVector[] = inputVectors.map((v, i) => ({
      id: v.id,
      values: embedResult.data![i],
      metadata: v.metadata,
      namespace: v.namespace,
    }))

    const result = await c.env.VECTOR_INDEX.upsert(vectorizeVectors)

    return c.json<UpsertResponse>({
      success: true,
      mutationId: result.ids?.join(',') ?? '',
      count: inputVectors.length,
    })
  } catch (error) {
    console.error('Upsert error:', error)
    return c.json<ErrorResponse>(
      {
        error: '向量存储失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * 语义搜索
 * POST /vectors/query
 *
 * 根据文本查找最相似的向量
 */
vectors.post('/query', async (c) => {
  const body = await c.req.json<QueryRequest>()
  const { text, topK = 10, namespace, filter } = body

  // 参数校验
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return c.json<ErrorResponse>({ error: 'text 必须是非空字符串' }, 400)
  }

  if (topK < 1 || topK > 100) {
    return c.json<ErrorResponse>({ error: 'topK 必须在 1-100 之间' }, 400)
  }

  try {
    // 生成查询向量（使用 query 类型的 instruction）
    const embedResult = await c.env.AI.run('@cf/qwen/qwen3-embedding-0.6b', {
      text: [text],
      instruction: 'Given a web search query, retrieve relevant passages that answer the query',
    })

    if (!embedResult.data || !embedResult.data[0]) {
      throw new Error('AI 返回结果无效')
    }

    const queryVector = embedResult.data[0]

    // 执行向量搜索
    const result = await c.env.VECTOR_INDEX.query(queryVector, {
      topK,
      namespace,
      filter,
      returnMetadata: 'all',
      returnValues: false,
    })

    return c.json<QueryResponse>({
      success: true,
      matches: result.matches.map((m) => ({
        id: m.id,
        score: m.score,
        metadata: m.metadata as QueryResponse['matches'][number]['metadata'],
      })),
      count: result.count,
    })
  } catch (error) {
    console.error('Query error:', error)
    return c.json<ErrorResponse>(
      {
        error: '搜索失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * 删除向量
 * DELETE /vectors
 *
 * 根据 ID 列表删除向量
 */
vectors.delete('/', async (c) => {
  const body = await c.req.json<DeleteRequest>()
  const { ids } = body

  // 参数校验
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json<ErrorResponse>({ error: 'ids 必须是非空数组' }, 400)
  }

  // 校验 ID 格式
  const invalidIds = ids.filter((id) => typeof id !== 'string' || id.trim() === '')
  if (invalidIds.length > 0) {
    return c.json<ErrorResponse>({ error: 'ID 必须是非空字符串' }, 400)
  }

  try {
    const result = await c.env.VECTOR_INDEX.deleteByIds(ids)

    return c.json<DeleteResponse>({
      success: true,
      mutationId: result.ids?.join(',') ?? '',
      count: ids.length,
    })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json<ErrorResponse>(
      {
        error: '删除失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export default vectors
