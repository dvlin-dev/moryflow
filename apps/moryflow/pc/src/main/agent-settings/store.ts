import Store from 'electron-store'
import type { AgentSettings } from '../../shared/ipc.js'
import { createDefaultAgentSettings, defaultAgentSettings } from './const.js'

export const agentSettingsStore = new Store<AgentSettings>({
  name: 'agent-settings',
  defaults: defaultAgentSettings,
})

export const resetStoreToDefault = (): AgentSettings => {
  const next = createDefaultAgentSettings()
  agentSettingsStore.store = next
  return next
}
