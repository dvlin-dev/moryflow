import { ipcMain } from 'electron';
import {
  approveToolRequest,
  consumeFullAccessUpgradePromptReminder,
  getApprovalContext,
} from '../services/approval/approval-gate-store.js';
import type { RegisterChatHandlersContext } from './register-context.js';

export const registerChatApprovalHandlers = (_context: RegisterChatHandlersContext) => {
  ipcMain.handle(
    'chat:approve-tool',
    async (
      _event,
      payload: {
        approvalId: string;
        action: 'once' | 'allow_type' | 'deny';
      }
    ) => {
      const { approvalId, action } = payload ?? {};
      if (!approvalId || !action) {
        throw new Error('Approval id is required.');
      }
      return approveToolRequest({ approvalId, action });
    }
  );

  ipcMain.handle('chat:approvals:get-context', (_event, payload: { approvalId: string }) => {
    const { approvalId } = payload ?? {};
    if (!approvalId) {
      throw new Error('Approval id is required.');
    }
    return getApprovalContext({ approvalId });
  });

  ipcMain.handle('chat:approvals:consume-upgrade-prompt', () => {
    return consumeFullAccessUpgradePromptReminder();
  });
};
