import { randomUUID } from 'node:crypto'
import type { UIMessage, UIMessageChunk, UIMessageStreamWriter, FileUIPart } from 'ai'
import { isFileUIPart, isTextUIPart, readUIMessageStream } from 'ai'
import { RunItemStreamEvent, RunRawModelStreamEvent } from '@anyhunt/agents-core'

import type { TokenUsage } from '../../shared/ipc.js'
import type { AgentStreamResult } from '../agent-runtime/index.js'
import { mapRunToolEventToChunk } from './tool-calls.js'

export const findLatestUserMessage = (messages: UIMessage[]): UIMessage | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') {
      return messages[index] ?? null
    }
  }
  return null
}

export const extractUserText = (message: UIMessage): string | null => {
  const textParts =
    message.parts
      ?.filter(isTextUIPart)
      .map((part) => part.text)
      .filter(Boolean) ?? []
  if (textParts.length === 0) {
    return null
  }
  return textParts.join('\n')
}

export const extractUserAttachments = (message: UIMessage): FileUIPart[] => {
  return message.parts?.filter(isFileUIPart) ?? []
}

export const cloneUIMessages = (messages: UIMessage[]): UIMessage[] => {
  try {
    return structuredClone(messages)
  } catch (error) {
    console.warn('[chat] structuredClone failed, falling back to shallow copy', error)
    return messages.map((message) => ({
      ...message,
      parts: message.parts ? message.parts.map((part) => ({ ...part })) : [],
    }))
  }
}

export const collectUiMessages = async (
  initialMessages: UIMessage[],
  stream: ReadableStream<UIMessageChunk>
): Promise<UIMessage[]> => {
  const restored = cloneUIMessages(initialMessages)
  try {
    const iterable = readUIMessageStream<UIMessage>({
      stream,
      onError: (error) => {
        console.error('[chat] readUIMessageStream onError (storage):', error)
      },
    })
    for await (const message of iterable) {
      const index = restored.findIndex((item) => item.id === message.id)
      if (index >= 0) {
        restored[index] = message
      } else {
        restored.push(message)
      }
    }
  } catch (error) {
    console.error('[chat] collectUiMessages error:', error)
  }
  return restored
}

/** 流式处理结果 */
export type StreamAgentRunResult = {
  finishReason?: string
  usage?: TokenUsage
}

/**
 * 流式处理 Agent 运行结果
 * 将 /agents SDK 的流事件转换为 UI 消息流
 */
export const streamAgentRun = async ({
  writer,
  result,
  toolNames,
  signal,
  messageId,
}: {
  writer: UIMessageStreamWriter<UIMessage>
  result: AgentStreamResult
  toolNames?: string[]
  signal?: AbortSignal
  /** 消息 ID，整轮对话使用同一个 ID */
  messageId?: string
}): Promise<StreamAgentRunResult> => {
  // 使用固定的消息 ID，整轮对话只用一个
  const textMessageId = messageId ?? randomUUID()
  const reasoningMessageId = randomUUID()
  // 跟踪当前文本段落状态（可以有多个 text-start/text-end 循环，但 ID 不变）
  let textSegmentStarted = false
  let reasoningSegmentStarted = false
  let finishReason: string | undefined
  // 累积 token 使用量（一次请求可能触发多次 LLM 调用）
  let totalUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  const isAborted = () => signal?.aborted === true

  const ensureReasoningStarted = () => {
    if (reasoningSegmentStarted) return true
    try {
      writer.write({ type: 'reasoning-start', id: reasoningMessageId })
      reasoningSegmentStarted = true
      return true
    } catch (error) {
      console.error('[chat] failed to write reasoning-start', error)
      return false
    }
  }

  const emitReasoningDelta = (delta: string) => {
    if (!delta) return
    if (!ensureReasoningStarted()) return
    try {
      writer.write({ type: 'reasoning-delta', id: reasoningMessageId, delta })
    } catch (error) {
      console.warn('[chat] failed to write reasoning-delta', error)
    }
  }

  const emitReasoningEnd = () => {
    if (!reasoningSegmentStarted) return
    reasoningSegmentStarted = false
    try {
      writer.write({ type: 'reasoning-end', id: reasoningMessageId })
    } catch (error) {
      console.warn('[chat] failed to write reasoning-end', error)
    }
  }

  const ensureTextStarted = () => {
    if (textSegmentStarted) return true
    // 在开始文本之前，结束 reasoning（如果有）
    if (reasoningSegmentStarted) {
      emitReasoningEnd()
    }
    try {
      writer.write({ type: 'text-start', id: textMessageId })
      textSegmentStarted = true
      return true
    } catch (error) {
      console.error('[chat] failed to write text-start', error)
      return false
    }
  }

  const emitTextDelta = (delta: string) => {
    if (!delta) return
    if (!ensureTextStarted()) return
    try {
      writer.write({ type: 'text-delta', id: textMessageId, delta })
    } catch (error) {
      console.warn('[chat] failed to write text-delta', error)
    }
  }

  const emitTextEnd = () => {
    if (!textSegmentStarted) return
    textSegmentStarted = false // 重置，允许后续开始新的文本段落
    try {
      writer.write({ type: 'text-end', id: textMessageId })
    } catch (error) {
      console.warn('[chat] failed to write text-end', error)
    }
  }

  try {
    for await (const event of result) {
      if (isAborted()) break

      // 处理工具调用事件
      if (event instanceof RunItemStreamEvent) {
        const chunk = mapRunToolEventToChunk(event, toolNames)
        if (chunk) {
          try {
            writer.write(chunk)
          } catch (error) {
            console.warn('[chat] failed to write tool chunk', error)
          }
        }
        continue
      }

      // 处理模型流事件
      if (event instanceof RunRawModelStreamEvent) {
        const extracted = extractStreamEvent(event.data)
        if (extracted.reasoningDelta) {
          emitReasoningDelta(extracted.reasoningDelta)
        }
        if (extracted.deltaText) {
          emitTextDelta(extracted.deltaText)
        }
        if (extracted.finishReason) {
          finishReason = extracted.finishReason
        }
        if (extracted.usage) {
          totalUsage.promptTokens += extracted.usage.promptTokens
          totalUsage.completionTokens += extracted.usage.completionTokens
          totalUsage.totalTokens += extracted.usage.totalTokens
        }
        if (extracted.isDone) {
          // 结束 reasoning（如果还在进行）
          emitReasoningEnd()
          emitTextEnd()
        }
      }

      // 调试：打印未处理的事件类型
      if (!(event instanceof RunItemStreamEvent) && !(event instanceof RunRawModelStreamEvent)) {
        console.log('[chat] unhandled event type:', event?.constructor?.name, event)
      }
    }
  } catch (error) {
    console.error('[chat] streamAgentRun error:', error)
    if (!isAbortError(error)) {
      throw error
    }
  }

  // 确保 reasoning 和文本流正确结束
  if (!isAborted()) {
    emitReasoningEnd()
    emitTextEnd()
  }

  // 等待流完成
  await result.completed.catch((error) => {
    console.error('[chat] result.completed error:', error)
    if (!isAbortError(error)) {
      throw error
    }
  })

  // 返回结果（仅当有 token 使用时才包含 usage）
  const hasUsage = totalUsage.totalTokens > 0
  return { finishReason, usage: hasUsage ? totalUsage : undefined }
}

/** 流事件提取结果 */
type StreamEventResult = {
  deltaText: string
  reasoningDelta: string
  isDone: boolean
  finishReason?: string
  usage?: TokenUsage
}

const EMPTY_RESULT: StreamEventResult = { deltaText: '', reasoningDelta: '', isDone: false }

/**
 * 从 /agents-extensions aisdk 流事件中提取文本和 reasoning
 *
 * aisdk 会 yield 以下事件类型：
 * - { type: 'output_text_delta', delta: '...' } - 文本增量
 * - { type: 'response_done', response: {...} } - 响应完成
 * - { type: 'model', event: {...} } - 底层模型原始事件
 *   - event.type === 'reasoning-delta' - reasoning 增量
 *   - event.type === 'finish' - 完成事件
 */
const extractStreamEvent = (data: unknown): StreamEventResult => {
  if (!data || typeof data !== 'object') return EMPTY_RESULT

  const record = data as Record<string, unknown>
  const eventType = record.type as string | undefined

  // 文本增量事件（主要来源）
  if (eventType === 'output_text_delta' && typeof record.delta === 'string') {
    return { deltaText: record.delta, reasoningDelta: '', isDone: false }
  }

  // 响应完成事件（包含 usage 信息）
  if (eventType === 'response_done') {
    const response = record.response as Record<string, unknown> | undefined
    const rawUsage = response?.usage as Record<string, number> | undefined
    const usage: TokenUsage | undefined = rawUsage
      ? {
          // 兼容驼峰和下划线两种命名
          promptTokens: rawUsage.inputTokens ?? rawUsage.input_tokens ?? rawUsage.prompt_tokens ?? 0,
          completionTokens: rawUsage.outputTokens ?? rawUsage.output_tokens ?? rawUsage.completion_tokens ?? 0,
          totalTokens: rawUsage.totalTokens ?? rawUsage.total_tokens ?? 0,
        }
      : undefined
    return { deltaText: '', reasoningDelta: '', isDone: true, finishReason: 'stop', usage }
  }

  // 底层模型事件
  if (eventType === 'model') {
    const event = record.event as Record<string, unknown> | undefined
    if (!event) return EMPTY_RESULT

    // reasoning-delta 事件 - 思考过程增量
    if (event.type === 'reasoning-delta' && typeof event.delta === 'string') {
      return { deltaText: '', reasoningDelta: event.delta, isDone: false }
    }

    // finish 事件
    if (event.type === 'finish') {
      const reason = (event.finishReason as string) || 'stop'
      return { deltaText: '', reasoningDelta: '', isDone: true, finishReason: reason }
    }
  }

  return EMPTY_RESULT
}

const isAbortError = (error: unknown): boolean => {
  if (!error) return false
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error instanceof Error && error.name === 'AbortError') return true
  return false
}
