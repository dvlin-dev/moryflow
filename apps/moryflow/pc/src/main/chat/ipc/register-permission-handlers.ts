import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import type { ModeSwitchAuditEvent } from '@moryflow/agents-runtime';
import {
  getGlobalPermissionMode,
  setGlobalPermissionMode,
} from '../../agent-runtime/runtime/runtime-config.js';
import { listVisibleSessions } from '../application/session-visibility.js';
import { autoApprovePendingForSession } from '../services/approval/approval-gate-store.js';
import { broadcastToRenderers } from '../services/broadcast/event-bus.js';
import type { RegisterChatHandlersContext } from './register-context.js';

export const registerChatPermissionHandlers = ({
  modeAuditWriter,
}: RegisterChatHandlersContext) => {
  ipcMain.handle('chat:permission:getGlobalMode', async () => {
    return getGlobalPermissionMode();
  });

  ipcMain.handle(
    'chat:permission:setGlobalMode',
    async (_event, payload: { mode: 'ask' | 'full_access'; sessionId?: string }) => {
      const { mode, sessionId } = payload ?? {};
      if (mode !== 'ask' && mode !== 'full_access') {
        throw new Error('Invalid global mode update request.');
      }

      const result = await setGlobalPermissionMode(mode);
      if (!result.changed) {
        return result.mode;
      }

      if (result.mode === 'full_access') {
        void Promise.allSettled(
          (await listVisibleSessions()).map((session) =>
            autoApprovePendingForSession({ sessionId: session.id })
          )
        ).then((settledResults) => {
          for (const settled of settledResults) {
            if (settled.status === 'rejected') {
              console.error('[chat] auto-approve pending approvals failed', settled.reason);
            }
          }
        });
      }

      const auditEvent: ModeSwitchAuditEvent = {
        eventId: randomUUID(),
        sessionId: sessionId && sessionId.trim().length > 0 ? sessionId : 'global',
        previousMode: result.previousMode,
        nextMode: result.mode,
        source: 'pc',
        timestamp: Date.now(),
      };
      void modeAuditWriter.append(auditEvent).catch((error) => {
        console.warn('[chat] mode audit failed', error);
      });

      broadcastToRenderers('chat:permission:global-mode-changed', { mode: result.mode });
      return result.mode;
    }
  );
};
