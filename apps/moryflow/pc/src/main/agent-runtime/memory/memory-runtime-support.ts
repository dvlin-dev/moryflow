/**
 * [PROVIDES]: createMemoryRuntimeSupport - Memory tooling/prompt 装配支撑
 * [DEPENDS]: memory capability/tooling/prompt builders
 * [POS]: PC Agent Runtime Memory 子域运行期协调层
 */

import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import { buildMemoryPromptBlockForWorkspaceId } from './memory-prompt.js';
import { resolveMemoryAccess, type MemoryAccess } from './memory-access.js';
import { buildMemoryTooling } from './memory-tooling.js';
import type { MemoryAccessDeps } from './memory-access.js';
import type { KnowledgeToolDeps } from './knowledge-tools.js';
import type { MemoryToolDeps } from './memory-tools.js';

export type MemoryRuntimeSupport = {
  getMemoryTools: () => Tool<AgentContext>[];
  getKnowledgeTools: () => Tool<AgentContext>[];
  getInstructions: () => string;
  refreshTooling: (chatId?: string) => Promise<MemoryAccess>;
  refreshPromptBlock: (access: MemoryAccess) => Promise<void>;
  getPromptBlock: () => string;
  prime: () => void;
  resetCapabilityCache: () => void;
  resetPromptCache: () => void;
};

type CreateMemoryRuntimeSupportInput = {
  capabilityDeps: MemoryAccessDeps;
  memoryToolDeps: MemoryToolDeps;
  knowledgeToolDeps: KnowledgeToolDeps;
  onToolsChanged: () => void;
  onPromptChanged: () => void;
};

const MEMORY_BLOCK_TTL_MS = 60_000;

export const createMemoryRuntimeSupport = (
  input: CreateMemoryRuntimeSupportInput
): MemoryRuntimeSupport => {
  let memoryTools: Tool<AgentContext>[] = [];
  let knowledgeTools: Tool<AgentContext>[] = [];
  let instructions = '';
  let capabilityKey = '';
  let cachedMemoryBlock = '';
  let memoryBlockCachedAt = 0;
  let memoryBlockWorkspaceId = '';

  const refreshTooling = async (chatId?: string): Promise<MemoryAccess> => {
    const access = await resolveMemoryAccess(input.capabilityDeps, chatId);
    const nextKey = JSON.stringify({
      state: access.state,
      hasVaultPath: access.state === 'enabled' && Boolean(access.vaultPath),
    });

    if (nextKey === capabilityKey) {
      return access;
    }

    const tooling = buildMemoryTooling(access, input.memoryToolDeps, input.knowledgeToolDeps);
    memoryTools = tooling.memoryTools;
    knowledgeTools = tooling.knowledgeTools;
    instructions = tooling.instructions;
    capabilityKey = nextKey;
    input.onToolsChanged();
    return access;
  };

  const refreshPromptBlock = async (access: MemoryAccess) => {
    if (access.state !== 'enabled') {
      memoryBlockCachedAt = 0;
      memoryBlockWorkspaceId = '';
      if (cachedMemoryBlock) {
        cachedMemoryBlock = '';
        input.onPromptChanged();
      }
      return;
    }

    const currentWorkspaceId = access.workspaceId;

    const now = Date.now();
    if (
      currentWorkspaceId === memoryBlockWorkspaceId &&
      now - memoryBlockCachedAt < MEMORY_BLOCK_TTL_MS
    ) {
      return;
    }

    const previous = cachedMemoryBlock;
    const fresh = await buildMemoryPromptBlockForWorkspaceId(
      input.memoryToolDeps,
      currentWorkspaceId
    );

    if (fresh || currentWorkspaceId !== memoryBlockWorkspaceId) {
      cachedMemoryBlock = fresh;
      memoryBlockCachedAt = now;
      memoryBlockWorkspaceId = currentWorkspaceId;
      if (cachedMemoryBlock !== previous) {
        input.onPromptChanged();
      }
    }
  };

  return {
    getMemoryTools: () => memoryTools,
    getKnowledgeTools: () => knowledgeTools,
    getInstructions: () => instructions,
    refreshTooling,
    refreshPromptBlock,
    getPromptBlock: () => cachedMemoryBlock,
    prime: () => {
      void refreshTooling().catch(() => {});
    },
    resetCapabilityCache: () => {
      capabilityKey = '';
    },
    resetPromptCache: () => {
      memoryBlockCachedAt = 0;
    },
  };
};
