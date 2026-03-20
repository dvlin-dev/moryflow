/**
 * [PROVIDES]: buildMemoryTooling - capability-aware memory/knowledge tool selection
 * [DEPENDS]: memory-capability, memory-tools, knowledge-tools, memory-prompt
 * [POS]: PC Agent Runtime Memory tool composition
 */

import type { Tool } from '@openai/agents-core';
import type { AgentContext } from '@moryflow/agents-runtime';
import type { MemoryToolCapability } from './memory-capability.js';
import { createMemoryTools, type MemoryToolDeps } from './memory-tools.js';
import { createKnowledgeTools, type KnowledgeToolDeps } from './knowledge-tools.js';
import { buildMemoryToolInstructions } from './memory-prompt.js';

const MEMORY_SEARCH_TOOL = 'memory_search';
const MEMORY_WRITE_TOOLS = new Set(['memory_save', 'memory_update']);
const KNOWLEDGE_SEARCH_TOOL = 'knowledge_search';
const KNOWLEDGE_READ_TOOL = 'knowledge_read';

export const buildMemoryTooling = (
  capability: MemoryToolCapability,
  memoryDeps: MemoryToolDeps,
  knowledgeDeps: KnowledgeToolDeps
): {
  memoryTools: Tool<AgentContext>[];
  knowledgeTools: Tool<AgentContext>[];
  instructions: string;
} => {
  if (!capability.canRead && !capability.canWrite) {
    return {
      memoryTools: [],
      knowledgeTools: [],
      instructions: '',
    };
  }

  const memoryTools = createMemoryTools(memoryDeps).filter((tool) => {
    if (tool.name === MEMORY_SEARCH_TOOL) return capability.canRead;
    if (MEMORY_WRITE_TOOLS.has(tool.name)) return capability.canWrite;
    return false;
  });

  const knowledgeTools = createKnowledgeTools(knowledgeDeps).filter((tool) => {
    if (tool.name === KNOWLEDGE_SEARCH_TOOL) return capability.canRead;
    if (tool.name === KNOWLEDGE_READ_TOOL) return capability.canReadKnowledgeFile;
    return false;
  });

  return {
    memoryTools,
    knowledgeTools,
    instructions: buildMemoryToolInstructions({
      canRead: capability.canRead,
      canWrite: capability.canWrite,
      canReadKnowledgeFile: capability.canReadKnowledgeFile,
    }),
  };
};
