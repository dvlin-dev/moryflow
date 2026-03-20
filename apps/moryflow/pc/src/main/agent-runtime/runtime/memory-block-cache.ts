import { buildMemoryPromptBlock } from '../memory/memory-prompt.js';
import type { MemoryToolDeps } from '../memory/memory-tools.js';

export const createMemoryBlockCache = (input: {
  memoryToolDeps: MemoryToolDeps;
  invalidateAgentFactory: () => void;
}) => {
  const { memoryToolDeps, invalidateAgentFactory } = input;
  const ttlMs = 60_000;
  let cachedMemoryBlock = '';
  let memoryBlockCachedAt = 0;
  let memoryBlockWorkspaceId = '';

  const refreshMemoryBlock = async (chatId?: string) => {
    const now = Date.now();
    let currentWorkspaceId = '';
    try {
      currentWorkspaceId = await memoryToolDeps.getWorkspaceId(chatId);
    } catch {
      memoryBlockCachedAt = 0;
      memoryBlockWorkspaceId = '';
      if (cachedMemoryBlock) {
        cachedMemoryBlock = '';
        invalidateAgentFactory();
      }
      return;
    }

    if (currentWorkspaceId === memoryBlockWorkspaceId && now - memoryBlockCachedAt < ttlMs) {
      return;
    }

    const previous = cachedMemoryBlock;
    const fresh = await buildMemoryPromptBlock(memoryToolDeps, chatId);
    if (fresh || currentWorkspaceId !== memoryBlockWorkspaceId) {
      cachedMemoryBlock = fresh;
      memoryBlockCachedAt = now;
      memoryBlockWorkspaceId = currentWorkspaceId;
      if (cachedMemoryBlock !== previous) {
        invalidateAgentFactory();
      }
    }
  };

  return {
    getMemoryBlock: () => cachedMemoryBlock,
    refreshMemoryBlock,
    reset: () => {
      memoryBlockCachedAt = 0;
      memoryBlockWorkspaceId = '';
    },
  };
};
