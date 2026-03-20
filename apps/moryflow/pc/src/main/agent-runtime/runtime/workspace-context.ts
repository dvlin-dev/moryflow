import type { PlatformCapabilities } from '@moryflow/agents-adapter';
import { createVaultUtils } from '@moryflow/agents-runtime';

import { chatSessionStore } from '../../chat-session-store/index.js';
import { ensureVaultAccess, getStoredVault } from '../../vault.js';
import { readWorkspaceFileIpc } from '../../app/memory-ipc-handlers.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import { memoryApi } from '../../memory/api/client.js';
import { workspaceProfileService } from '../../workspace-profile/service.js';
import { resolveActiveWorkspaceProfileContext } from '../../workspace-profile/context.js';
import { createDesktopCrypto } from '../desktop-adapter.js';
import { getRuntimeVaultRoot } from '../runtime-vault-context.js';
import type { KnowledgeToolDeps } from '../memory/knowledge-tools.js';
import type { MemoryToolDeps } from '../memory/memory-tools.js';

export const createRuntimeVaultResolver = (input: { capabilities: PlatformCapabilities }) => {
  const { capabilities } = input;

  const resolveFallbackVaultRoot = async (): Promise<string> => {
    const activeVault = await getStoredVault();
    if (!activeVault?.path) {
      throw new Error('No workspace selected.');
    }
    return activeVault.path;
  };

  const resolveSessionVaultRoot = (chatId: string): string | null => {
    try {
      const session = chatSessionStore.getSummary(chatId);
      const scopedVaultPath = session.vaultPath.trim();
      return scopedVaultPath.length > 0 && capabilities.path.isAbsolute(scopedVaultPath)
        ? scopedVaultPath
        : null;
    } catch {
      return null;
    }
  };

  const resolveRuntimeVaultRoot = async (chatId?: string): Promise<string> => {
    const runtimeScopedVaultRoot = getRuntimeVaultRoot();
    const sessionScopedVaultRoot = chatId ? resolveSessionVaultRoot(chatId) : null;
    const fallbackVaultRoot = runtimeScopedVaultRoot ?? sessionScopedVaultRoot;
    const rawVaultRoot = fallbackVaultRoot ?? (await resolveFallbackVaultRoot());
    await ensureVaultAccess(rawVaultRoot);
    return capabilities.path.resolve(rawVaultRoot);
  };

  return {
    resolveRuntimeVaultRoot,
    createVaultUtils: (crypto: ReturnType<typeof createDesktopCrypto>) =>
      createVaultUtils(capabilities, crypto, async () => resolveRuntimeVaultRoot()),
  };
};

export const createWorkspaceScopedToolDeps = (input: {
  capabilities: PlatformCapabilities;
  onMemoryMutated: () => void;
}) => {
  const { capabilities, onMemoryMutated } = input;

  const memoryToolDeps: MemoryToolDeps = {
    getWorkspaceId: async (chatId?: string, requireSession?: boolean) => {
      if (chatId) {
        try {
          const summary = chatSessionStore.getSummary(chatId);
          if (summary.profileKey) {
            const sepIdx = summary.profileKey.indexOf(':');
            if (sepIdx > 0) {
              const userId = summary.profileKey.slice(0, sepIdx);
              const clientWorkspaceId = summary.profileKey.slice(sepIdx + 1);
              const profile = workspaceProfileService.getProfile(userId, clientWorkspaceId);
              if (profile?.workspaceId) {
                return profile.workspaceId;
              }
            }
          }
        } catch {
          // Session lookup failed
        }
      }
      if (requireSession) {
        throw new Error('Cannot resolve session workspace for memory write operation');
      }
      const ctx = await resolveActiveWorkspaceProfileContext();
      if (!ctx.profile?.workspaceId) {
        throw new Error('No active workspace profile');
      }
      return ctx.profile.workspaceId;
    },
    api: memoryApi,
    onMemoryMutated,
  };

  const knowledgeToolDeps: KnowledgeToolDeps = {
    ...memoryToolDeps,
    readWorkspaceFile: (inputPayload, chatId) => {
      const resolveProfile = async () => {
        const ctx = await resolveActiveWorkspaceProfileContext();

        if (chatId) {
          try {
            const summary = chatSessionStore.getSummary(chatId);
            const sessionVaultPath = summary.vaultPath?.trim();
            const sessionProfileKey = summary.profileKey;

            if (sessionVaultPath && capabilities.path.isAbsolute(sessionVaultPath)) {
              const sessionVault = {
                id: ctx.activeVault?.id ?? '',
                name: ctx.activeVault?.name ?? '',
                path: sessionVaultPath,
                addedAt: ctx.activeVault?.addedAt ?? 0,
              };

              let sessionProfile = ctx.profile;
              if (sessionProfileKey) {
                const sepIdx = sessionProfileKey.indexOf(':');
                if (sepIdx > 0) {
                  const userId = sessionProfileKey.slice(0, sepIdx);
                  const clientWorkspaceId = sessionProfileKey.slice(sepIdx + 1);
                  const resolvedProfile = workspaceProfileService.getProfile(
                    userId,
                    clientWorkspaceId
                  );
                  if (resolvedProfile?.workspaceId && sessionProfile) {
                    sessionProfile = {
                      ...sessionProfile,
                      workspaceId: resolvedProfile.workspaceId,
                    };
                  }
                }
              }

              return {
                loggedIn: ctx.loggedIn,
                activeVault: sessionVault,
                profile: sessionProfile,
              };
            }
          } catch {
            // Fall through to active profile
          }
        }

        return { loggedIn: ctx.loggedIn, activeVault: ctx.activeVault, profile: ctx.profile };
      };

      return readWorkspaceFileIpc(
        {
          profiles: { resolveActiveProfile: resolveProfile },
          engine: {
            getStatus: () => ({ engineStatus: 'idle' as const, pendingCount: 0, lastSyncAt: null }),
          },
          usage: { getUsage: async () => ({ storage: { used: 0, limit: 0, percentage: 0 } }) },
          documentRegistry: workspaceDocRegistry,
          api: memoryApi,
        },
        inputPayload
      );
    },
  };

  return {
    memoryToolDeps,
    knowledgeToolDeps,
  };
};
