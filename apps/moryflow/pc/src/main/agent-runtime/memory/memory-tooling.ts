/**
 * [PROVIDES]: buildMemoryTooling - access-aware memory/knowledge tool selection
 * [DEPENDS]: memory-access, memory-tools, knowledge-tools, memory-prompt
 * [POS]: PC Agent Runtime Memory tool composition
 */

import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import type { MemoryAccess } from './memory-access.js';
import { createMemoryTools, type MemoryToolDeps } from './memory-tools.js';
import { createKnowledgeTools, type KnowledgeToolDeps } from './knowledge-tools.js';
import { buildMemoryToolInstructions } from './memory-prompt.js';

const KNOWLEDGE_READ_TOOL = 'knowledge_read';

export const buildMemoryTooling = (
  access: MemoryAccess,
  memoryDeps: MemoryToolDeps,
  knowledgeDeps: KnowledgeToolDeps
): {
  memoryTools: Tool<AgentContext>[];
  knowledgeTools: Tool<AgentContext>[];
  instructions: string;
} => {
  if (access.state !== 'enabled') {
    return {
      memoryTools: [],
      knowledgeTools: [],
      instructions: '',
    };
  }

  const memoryTools = createMemoryTools(memoryDeps);

  const knowledgeTools = createKnowledgeTools(knowledgeDeps).filter((tool) => {
    if (tool.name === KNOWLEDGE_READ_TOOL) return Boolean(access.vaultPath);
    return true;
  });

  return {
    memoryTools,
    knowledgeTools,
    instructions: buildMemoryToolInstructions({
      enabled: true,
      canReadKnowledgeFile: Boolean(access.vaultPath),
    }),
  };
};
