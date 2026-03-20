import { createVaultUtils } from '@moryflow/agents-runtime';
import {
  createDesktopCapabilities,
  createDesktopCrypto,
} from '../../agent-runtime/runtime/desktop-adapter.js';
import { createDesktopModeSwitchAuditWriter } from '../../agent-runtime/permission/mode-audit.js';
import type { ActiveStreamRegistry } from '../services/active-stream-registry.js';

export type BroadcastMessageSnapshot = (sessionId: string, persisted?: boolean) => void;

export type RegisterChatHandlersContext = {
  activeStreams: ActiveStreamRegistry;
  broadcastMessageSnapshot: BroadcastMessageSnapshot;
  capabilities: ReturnType<typeof createDesktopCapabilities>;
  crypto: ReturnType<typeof createDesktopCrypto>;
  modeAuditWriter: ReturnType<typeof createDesktopModeSwitchAuditWriter>;
  vaultUtils: ReturnType<typeof createVaultUtils>;
};
