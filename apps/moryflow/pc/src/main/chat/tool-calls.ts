import { randomUUID } from 'node:crypto'
import { RunToolCallItem, RunToolCallOutputItem, RunToolApprovalItem, RunItemStreamEvent } from '@aiget/agents-core'
import type { UIMessage, UIMessageChunk, UIMessageStreamWriter } from 'ai'

type ToolCallInputInfo = {
  toolCallId: string
  toolName: string
  input: unknown
  providerExecuted?: boolean
}

type ToolCallOutputInfo = {
  toolCallId: string
  toolName?: string
  output?: unknown
  errorText?: string
  providerExecuted?: boolean
}

const safeJsonParse = (value: string | null | undefined) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const extractToolCallInput = (raw: unknown): ToolCallInputInfo | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  const toolName =
    typeof record.name === 'string'
      ? record.name
      : typeof record.toolName === 'string'
        ? record.toolName
        : 'tool'
  const toolCallId =
    (typeof record.callId === 'string' && record.callId.length > 0
      ? record.callId
      : typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : randomUUID())
  const argsSource = record.arguments ?? record.input
  const input =
    typeof argsSource === 'string' ? safeJsonParse(argsSource) ?? argsSource : argsSource ?? null
  const providerExecuted =
    typeof record.providerExecuted === 'boolean' ? record.providerExecuted : undefined
  return {
    toolCallId,
    toolName,
    input,
    providerExecuted,
  }
}

const extractToolCallOutput = (item: RunToolCallOutputItem): ToolCallOutputInfo | null => {
  const raw = item.rawItem
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  const toolName =
    typeof record.name === 'string'
      ? record.name
      : typeof record.toolName === 'string'
        ? record.toolName
        : undefined
  const toolCallId =
    (typeof record.callId === 'string' && record.callId.length > 0
      ? record.callId
      : typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : randomUUID())
  const providerExecuted =
    typeof record.providerExecuted === 'boolean' ? record.providerExecuted : undefined
  const rawOutput = item.output ?? record.output
  const output =
    typeof rawOutput === 'string' ? safeJsonParse(rawOutput) ?? rawOutput : rawOutput ?? null
  const errorText =
    typeof record.errorText === 'string' && record.errorText.length > 0 ? record.errorText : undefined
  return {
    toolCallId,
    toolName,
    output,
    errorText,
    providerExecuted,
  }
}

export const mapRunToolEventToChunk = (
  event: RunItemStreamEvent,
  knownToolNames?: string[],
): UIMessageChunk | null => {
  const dynamicFlag = (toolName: string | undefined) =>
    typeof toolName === 'string' && knownToolNames ? !knownToolNames.includes(toolName) : undefined

  if (event.name === 'tool_called' && event.item instanceof RunToolCallItem) {
    const info = extractToolCallInput(event.item.rawItem)
    if (!info) {
      return null
    }
    return {
      type: 'tool-input-available',
      toolCallId: info.toolCallId,
      toolName: info.toolName,
      input: info.input,
      providerExecuted: info.providerExecuted,
      dynamic: dynamicFlag(info.toolName),
    }
  }

  if (event.name === 'tool_output' && event.item instanceof RunToolCallOutputItem) {
    const info = extractToolCallOutput(event.item)
    if (!info) {
      return null
    }
    return {
      type: info.errorText ? 'tool-output-error' : 'tool-output-available',
      toolCallId: info.toolCallId,
      output: info.output,
      errorText: info.errorText,
      providerExecuted: info.providerExecuted,
      dynamic: dynamicFlag(info.toolName),
    } as UIMessageChunk
  }

  if (event.name === 'tool_approval_requested' && event.item instanceof RunToolApprovalItem) {
    // 透传审批事件，供前端审批抽屉监听
    const raw = (event.item.rawItem ?? {}) as Record<string, unknown>
    const callId =
      typeof raw.callId === 'string'
        ? raw.callId
        : typeof raw.id === 'string'
          ? raw.id
          : randomUUID()
    const providerExecuted = typeof raw.providerExecuted === 'boolean' ? raw.providerExecuted : undefined
    return {
      type: 'tool-input-available',
      toolCallId: callId,
      toolName: 'await_human_confirmation',
      input: raw.input ?? null,
      providerExecuted,
      dynamic: true,
    }
  }

  return null
}

export const writeErrorResponse = (writer: UIMessageStreamWriter<UIMessage>, errorText: string) => {
  writer.write({ type: 'error', errorText })
}
