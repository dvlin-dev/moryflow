import type { AgentChatRequestOptions } from '../../shared/ipc.js'

export const normalizeAgentOptions = (raw: unknown): AgentChatRequestOptions | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const candidate = raw as Record<string, unknown>
  const normalized: AgentChatRequestOptions = {}
  if (typeof candidate.preferredModelId === 'string' && candidate.preferredModelId.length > 0) {
    normalized.preferredModelId = candidate.preferredModelId
  }
  const legacyFilePath =
    typeof candidate.activeFilePath === 'string' && candidate.activeFilePath.length > 0
      ? candidate.activeFilePath
      : undefined
  const legacySummary =
    typeof candidate.contextSummary === 'string' && candidate.contextSummary.length > 0
      ? candidate.contextSummary
      : undefined
  const contextCandidate = candidate.context
  if (contextCandidate && typeof contextCandidate === 'object') {
    const contextRecord = contextCandidate as Record<string, unknown>
    const filePath =
      typeof contextRecord.filePath === 'string' && contextRecord.filePath.length > 0
        ? contextRecord.filePath
        : legacyFilePath
    const summary =
      typeof contextRecord.summary === 'string' && contextRecord.summary.length > 0
        ? contextRecord.summary
        : legacySummary
    if (filePath || summary) {
      normalized.context = {}
      if (filePath) {
        normalized.context.filePath = filePath
      }
      if (summary) {
        normalized.context.summary = summary
      }
    }
  } else if (legacyFilePath || legacySummary) {
    normalized.context = {}
    if (legacyFilePath) {
      normalized.context.filePath = legacyFilePath
    }
    if (legacySummary) {
      normalized.context.summary = legacySummary
    }
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined
}
