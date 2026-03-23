/**
 * [PROVIDES]: createKnowledgeReader - session-bound knowledge_read bridge
 * [DEPENDS]: workspace profile context, memory scope resolver, readWorkspaceFileIpc
 * [POS]: PC Agent Runtime Memory 子域的全文读取装配
 */

import type { PathUtils } from '@moryflow/agents-adapter';
import { readWorkspaceFileIpc } from '../../app/ipc/memory-domain/knowledge-read.js';
import { workspaceDocRegistry } from '../../workspace-doc-registry/index.js';
import { memoryApi } from '../../memory/api/client.js';
import { resolveActiveWorkspaceProfileContext } from '../../workspace-profile/context.js';
import { type MemoryScopeDeps, resolveSessionMemoryScope } from './memory-scope.js';
import type { KnowledgeToolDeps } from './knowledge-tools.js';

type CreateKnowledgeReaderInput = {
  pathUtils: Pick<PathUtils, 'isAbsolute'>;
  getSessionSummary: MemoryScopeDeps['getSessionSummary'];
  getProfile: MemoryScopeDeps['getProfile'];
};

export const createKnowledgeReader = (
  input: CreateKnowledgeReaderInput
): NonNullable<KnowledgeToolDeps['readWorkspaceFile']> => {
  const scopeDeps: MemoryScopeDeps = {
    getSessionSummary: input.getSessionSummary,
    getProfile: input.getProfile,
    isAbsolutePath: input.pathUtils.isAbsolute,
  };

  return (payload, chatId) => {
    const resolveProfile = async () => {
      const ctx = await resolveActiveWorkspaceProfileContext();
      const sessionScope = resolveSessionMemoryScope(scopeDeps, chatId);

      if (chatId && sessionScope.state !== 'resolved') {
        return {
          loggedIn: ctx.loggedIn,
          profileKey: null,
          activeVault: null,
          profile: null,
        };
      }

      if (sessionScope.state === 'resolved') {
        const sessionVault = sessionScope.vaultPath
          ? {
              id: ctx.activeVault?.id ?? '',
              name: ctx.activeVault?.name ?? '',
              path: sessionScope.vaultPath,
              addedAt: ctx.activeVault?.addedAt ?? 0,
            }
          : null;

        return {
          loggedIn: ctx.loggedIn,
          profileKey: sessionScope.profileKey,
          activeVault: sessionVault,
          profile: sessionScope.profile,
        };
      }

      return {
        loggedIn: ctx.loggedIn,
        profileKey: ctx.profileKey,
        activeVault: ctx.activeVault,
        profile: ctx.profile,
      };
    };

    return readWorkspaceFileIpc(
      {
        profiles: { resolveActiveProfile: resolveProfile },
        engine: {
          getStatus: () => ({ engineStatus: 'idle' as const, pendingCount: 0, lastSyncAt: null }),
        },
        memoryIndexing: {
          getBootstrapState: () => ({ pending: false, hasLocalDocuments: false }),
        },
        usage: {
          getUsage: async () => ({ storage: { used: 0, limit: 0, percentage: 0 } }),
        },
        documentRegistry: workspaceDocRegistry,
        api: memoryApi,
      },
      payload
    );
  };
};
