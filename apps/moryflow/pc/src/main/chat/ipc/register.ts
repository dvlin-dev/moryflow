import { createVaultUtils } from '@moryflow/agents-runtime';
import {
  createDesktopCapabilities,
  createDesktopCrypto,
} from '../../agent-runtime/desktop-adapter.js';
import { createDesktopModeSwitchAuditWriter } from '../../agent-runtime/mode-audit.js';
import { chatSessionStore } from '../../chat-session-store/index.js';
import { getStoredVault } from '../../vault.js';
import { createActiveStreamRegistry } from '../services/active-stream-registry.js';
import { broadcastMessageEvent } from '../services/broadcast/event-bus.js';
import { registerChatAgentHandlers } from './register-agent-handlers.js';
import { registerChatApprovalHandlers } from './register-approval-handlers.js';
import { registerChatEditHandlers } from './register-edit-handlers.js';
import { registerChatPermissionHandlers } from './register-permission-handlers.js';
import { registerChatSessionHandlers } from './register-session-handlers.js';

const activeStreams = createActiveStreamRegistry();

export const registerChatHandlers = () => {
  const modeAuditWriter = createDesktopModeSwitchAuditWriter();
  const broadcastMessageSnapshot = (sessionId: string, persisted = true) => {
    broadcastMessageEvent({
      type: 'snapshot',
      sessionId,
      messages: chatSessionStore.getUiMessages(sessionId),
      persisted,
    });
  };

  const capabilities = createDesktopCapabilities();
  const crypto = createDesktopCrypto();
  const vaultUtils = createVaultUtils(capabilities, crypto, async () => {
    const vaultInfo = await getStoredVault();
    if (!vaultInfo) {
      throw new Error('No workspace selected.');
    }
    return vaultInfo.path;
  });

  const context = {
    activeStreams,
    broadcastMessageSnapshot,
    capabilities,
    crypto,
    modeAuditWriter,
    vaultUtils,
  };

  registerChatAgentHandlers(context);
  registerChatSessionHandlers(context);
  registerChatPermissionHandlers(context);
  registerChatApprovalHandlers(context);
  registerChatEditHandlers(context);
};
