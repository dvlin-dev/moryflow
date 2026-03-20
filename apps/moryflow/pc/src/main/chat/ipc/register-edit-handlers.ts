import { ipcMain } from 'electron';
import { applyWriteOperation, writeOperationSchema } from '@moryflow/agents-tools';
import type { AgentApplyEditInput } from '../../../shared/ipc.js';
import type { RegisterChatHandlersContext } from './register-context.js';

export const registerChatEditHandlers = ({
  capabilities,
  crypto,
  vaultUtils,
}: RegisterChatHandlersContext) => {
  ipcMain.handle('chat:apply-edit', async (_event, payload: AgentApplyEditInput) => {
    const operation = writeOperationSchema.parse(payload ?? {});
    try {
      return await applyWriteOperation(operation, {
        vaultUtils,
        fs: capabilities.fs,
        crypto,
      });
    } catch (error) {
      console.error('[chat] apply-edit failed', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });
};
