/**
 * [PROVIDES]: createKnowledgeTools - knowledge_search agent tool
 * [DEPENDS]: @openai/agents-core, zod, memory/api/client
 * [POS]: PC Agent Runtime knowledge tool factory
 */

import { tool } from '@openai/agents-core';
import type { RunContext, Tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';
import type { MemoryToolDeps } from './memory-tools.js';

const knowledgeSearchSchema = z.object({
  query: z.string().min(1).describe('Search query to find relevant files and knowledge'),
});

export const createKnowledgeTools = (deps: MemoryToolDeps): Tool<AgentContext>[] => [
  tool<typeof knowledgeSearchSchema, AgentContext>({
    name: 'knowledge_search',
    description:
      "Search the user's workspace files for relevant knowledge. Use when the user asks about their own content, needs references from their files, or when file context would improve your answer. Search proactively when the topic relates to the user's workspace.",
    parameters: knowledgeSearchSchema,
    execute: async ({ query }, runContext?: RunContext<AgentContext>) => {
      try {
        const workspaceId = await deps.getWorkspaceId(runContext?.context?.chatId);
        const result = await deps.api.search({
          workspaceId,
          query,
          limitPerGroup: 10,
        });
        const items = result.groups.files.items.map((item) => ({
          title: item.title,
          path: item.path,
          snippet: item.snippet,
          score: item.score,
        }));
        return { items };
      } catch {
        return { error: 'Knowledge search is currently unavailable.' };
      }
    },
  }),
];
