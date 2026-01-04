import { tool } from '@aiget/agents'
import { z } from 'zod'
import type { PlatformCapabilities } from '@aiget/agents-adapter'
import { toolSummarySchema } from '../shared'

const MAX_CONTENT_LENGTH = 100 * 1024 // 100KB

const webFetchParams = z.object({
  summary: toolSummarySchema.default('web_fetch'),
  url: z.string().url().describe('要获取的网页 URL（必须是完整的 URL）'),
  prompt: z.string().min(1).describe('告诉我你想从网页中提取什么信息'),
})

/**
 * 简单的 HTML 转文本处理
 */
const htmlToText = (html: string): string => {
  return (
    html
      // 移除 script 和 style
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // 移除 HTML 注释
      .replace(/<!--[\s\S]*?-->/g, '')
      // 将块级元素转为换行
      .replace(/<\/(p|div|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
      .replace(/<(br|hr)[^>]*\/?>/gi, '\n')
      // 移除所有其他标签
      .replace(/<[^>]+>/g, ' ')
      // 解码 HTML 实体
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      // 清理空白
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim()
  )
}

/**
 * 创建网页抓取工具
 */
export const createWebFetchTool = (capabilities: PlatformCapabilities) => {
  const { fetch: fetchFn } = capabilities

  return tool({
    name: 'web_fetch',
    description:
      '获取网页内容并提取信息。可用于抓取文章、获取文档或保存网页内容到笔记。HTTP 自动升级为 HTTPS。',
    parameters: webFetchParams,
    async execute({ url, prompt }) {
      console.log('[tool] web_fetch', { url, prompt })

      // HTTP 自动升级为 HTTPS
      const secureUrl = url.replace(/^http:\/\//i, 'https://')

      try {
        const response = await fetchFn(secureUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          },
          redirect: 'follow',
        })

        if (!response.ok) {
          return {
            success: false,
            url: secureUrl,
            error: `HTTP ${response.status}: ${response.statusText}`,
          }
        }

        const contentType = response.headers.get('content-type') ?? ''
        const isHtml = contentType.includes('text/html')
        const isText =
          contentType.includes('text/') || contentType.includes('application/json')

        if (!isHtml && !isText) {
          return {
            success: false,
            url: secureUrl,
            error: `不支持的内容类型: ${contentType}`,
          }
        }

        let text = await response.text()

        // 限制内容长度
        if (text.length > MAX_CONTENT_LENGTH) {
          text = text.slice(0, MAX_CONTENT_LENGTH) + '\n...[内容已截断]'
        }

        // 如果是 HTML，转换为纯文本
        const content = isHtml ? htmlToText(text) : text

        return {
          success: true,
          url: secureUrl,
          contentType,
          content,
          prompt,
          note: '已获取网页内容，请根据 prompt 提取所需信息',
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return {
          success: false,
          url: secureUrl,
          error: `获取失败: ${message}`,
        }
      }
    },
  })
}
