import type { AgentSettings, AgentSettingsUpdate } from '../../shared/ipc.js'
import { buildPatchedAgentSettings, normalizeAgentSettings } from './normalize.js'
import { agentSettingsStore, resetStoreToDefault } from './store.js'

const listeners = new Set<(next: AgentSettings, previous: AgentSettings) => void>()

const notifyChange = (prev: AgentSettings, next: AgentSettings) => {
  for (const listener of listeners) {
    listener(next, prev)
  }
}

export const getAgentSettings = (): AgentSettings =>
  normalizeAgentSettings(agentSettingsStore.store)

export const updateAgentSettings = (patch: AgentSettingsUpdate): AgentSettings => {
  const current = getAgentSettings()
  const next = buildPatchedAgentSettings(current, patch)
  agentSettingsStore.store = next
  notifyChange(current, next)
  return next
}

/**
 * 还原默认配置并广播变更。
 */
export const resetAgentSettings = (): AgentSettings => {
  const previous = getAgentSettings()
  const next = resetStoreToDefault()
  notifyChange(previous, next)
  return next
}

export const onAgentSettingsChange = (
  listener: (next: AgentSettings, previous: AgentSettings) => void,
) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
