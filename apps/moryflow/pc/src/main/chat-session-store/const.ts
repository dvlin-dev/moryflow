import type { AgentInputItem } from '@anyhunt/agents'
import type { UIMessage } from 'ai'
import type { ChatSessionSummary } from '../../shared/ipc.js'

export type PersistedChatSession = ChatSessionSummary & {
  history: AgentInputItem[]
  uiMessages?: UIMessage[]
}

export type ChatSessionStoreShape = {
  sessions: Record<string, PersistedChatSession>
  sequence: number
}

export type AgentMessage = AgentInputItem & {
  role?: string
  content?: string | Array<{ type?: string; text?: string; [key: string]: unknown }>
}

export const STORE_NAME = 'chat-sessions'

export const DEFAULT_STORE: ChatSessionStoreShape = {
  sessions: {},
  sequence: 1,
}
