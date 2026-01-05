import { Hono } from 'hono'
import type { Env, EmbedRequest, EmbedResponse, ErrorResponse } from '../types'

const embed = new Hono<{ Bindings: Env }>()

/**
 * 生成向量嵌入
 * POST /embed
 *
 * @param texts - 要生成向量的文本数组（最多 32 条）
 * @param type - 类型：'query' 用于搜索查询，'document' 用于存储文档
 */
embed.post('/', async (c) => {
  const body = await c.req.json<EmbedRequest>()
  const { texts, type = 'document' } = body

  // 参数校验
  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return c.json<ErrorResponse>({ error: 'texts 必须是非空数组' }, 400)
  }

  if (texts.length > 32) {
    return c.json<ErrorResponse>({ error: '单次最多处理 32 条文本' }, 400)
  }

  // 检查是否有空文本
  const hasEmptyText = texts.some((t) => typeof t !== 'string' || t.trim() === '')
  if (hasEmptyText) {
    return c.json<ErrorResponse>({ error: '文本不能为空' }, 400)
  }

  try {
    // query 类型使用 instruction 提升搜索效果
    const instruction =
      type === 'query'
        ? 'Given a web search query, retrieve relevant passages that answer the query'
        : undefined

    const result = await c.env.AI.run('@cf/qwen/qwen3-embedding-0.6b', {
      text: texts,
      ...(instruction && { instruction }),
    })

    if (!result.data || !result.shape) {
      throw new Error('AI 返回结果无效')
    }

    return c.json<EmbedResponse>({
      success: true,
      data: result.data,
      shape: result.shape,
    })
  } catch (error) {
    console.error('Embedding error:', error)
    return c.json<ErrorResponse>(
      {
        error: '向量生成失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export default embed
