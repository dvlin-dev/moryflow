import { app } from 'electron'
import { rm } from 'node:fs/promises'
import type { ResetAppResult } from '../shared/ipc.js'

/**
 * 重置软件设置：删除整个用户数据目录
 * 删除后需要重启应用才能生效
 */
export const resetApp = async (): Promise<ResetAppResult> => {
  const userDataPath = app.getPath('userData')

  try {
    await rm(userDataPath, { recursive: true, force: true })
    return { success: true }
  } catch (error) {
    console.error('[app-maintenance] reset app failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
