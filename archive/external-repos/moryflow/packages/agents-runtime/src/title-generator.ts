/**
 * AI 自动生成对话标题
 */

import type { LanguageModelV3 } from '@ai-sdk/provider'

const TITLE_PROMPT = `Based on the following message, generate a concise title (max 20 characters in Chinese, no quotes or punctuation at the end):

User message: {content}

Title:`

const MAX_TITLE_LENGTH = 30

/**
 * 使用 AI 生成对话标题
 *
 * @param model - AI SDK LanguageModelV3 实例
 * @param userMessage - 用户发送的第一条消息
 * @returns 生成的标题
 */
export async function generateChatTitle(
  model: LanguageModelV3,
  userMessage: string
): Promise<string> {
  // 截取用户消息前 200 字符作为上下文
  const truncatedMessage = userMessage.slice(0, 200)
  const prompt = TITLE_PROMPT.replace('{content}', truncatedMessage)

  // 直接调用模型的 doGenerate 方法
  const result = await model.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
    maxOutputTokens: 50,
  })

  // 从 content 数组中提取文本
  const textContent = result.content.find((c) => c.type === 'text')
  const text = textContent?.type === 'text' ? textContent.text : ''

  // 清理并截断标题
  const cleanedTitle = text
    .trim()
    .replace(/^["']|["']$/g, '') // 移除首尾引号
    .replace(/[。.!！?？]$/, '') // 移除结尾标点

  return cleanedTitle.slice(0, MAX_TITLE_LENGTH)
}
