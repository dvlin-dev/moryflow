import { app } from 'electron';
import { rm } from 'node:fs/promises';
import type { ResetAppResult } from '../../shared/ipc.js';

/**
 * 重置软件设置：删除整个用户数据目录，然后自动重启应用。
 * 使用 app.exit(0) 而非 app.quit() 以避免 before-quit 回写已删除的数据。
 */
export const resetApp = async (): Promise<ResetAppResult> => {
  const userDataPath = app.getPath('userData');

  try {
    await rm(userDataPath, { recursive: true, force: true });
    // 延迟 300ms 让 IPC 响应到达 renderer，然后自动重启
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 300);
    return { success: true };
  } catch (error) {
    console.error('[app-maintenance] reset app failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
