import { BrowserWindow } from 'electron'
import { onAgentSettingsChange } from '../agent-settings/index.js'

/**
 * 将 Agent 配置变更广播给所有已打开窗口。
 */
export const createAgentSettingsBridge = () => {
  const broadcastAgentSettingsChange = (settings: unknown) => {
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        window.webContents.send('agent:settings-changed', settings)
      } catch (error) {
        console.warn('[agent-settings] broadcast failed', error)
      }
    }
  }

  const bindAgentSettingsChange = () => {
    onAgentSettingsChange((next) => {
      broadcastAgentSettingsChange(next)
    })
  }

  return {
    bindAgentSettingsChange,
    broadcastAgentSettingsChange,
  }
}
