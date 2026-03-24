/**
 * [PROVIDES]: createMemoryTools - memory_search / memory_save / memory_update agent tools
 * [DEPENDS]: @openai/agents-core, zod, memory/api/client
 * [POS]: PC Agent Runtime memory tool factory
 */

import { tool } from '@openai/agents-core';
import type { RunContext, Tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';
import type { memoryApi } from '../../memory/api/client.js';

export type MemoryToolDeps = {
  /** Resolve session-bound workspaceId for memory/knowledge tools. */
  getWorkspaceId: (chatId?: string) => Promise<string>;
  api: typeof memoryApi;
  /** Called after memory_save/memory_update to invalidate prompt cache. */
  onMemoryMutated?: () => void;
};

const memorySearchSchema = z.object({
  query: z.string().min(1).describe('Search query to find relevant memories'),
});

const memorySaveSchema = z.object({
  text: z.string().min(1).describe(`The fact to remember, as a clear single statement`),
  category: z
    .enum(['preference', 'interest', 'profile', 'context'])
    .describe(
      `preference=how they like things done, interest=topics they care about, profile=role/skills/experience, context=ongoing projects/goals`
    ),
});

const memoryUpdateSchema = z.object({
  id: z.string().min(1).describe('Memory ID to update (from memory_search results)'),
  text: z.string().min(1).describe('Updated fact text'),
});

const getChatId = (runContext?: RunContext<AgentContext>): string | undefined =>
  runContext?.context?.chatId;

export const createMemoryTools = (deps: MemoryToolDeps): Tool<AgentContext>[] => [
  tool<typeof memorySearchSchema, AgentContext>({
    name: 'memory_search',
    description: `Search your personal memories about this user. Use when the user references past context, when their question could benefit from personal knowledge, or when you want to check what you already know before asking. Returns only editable personal memories.`,
    parameters: memorySearchSchema,
    execute: async ({ query }, runContext) => {
      try {
        const workspaceId = await deps.getWorkspaceId(getChatId(runContext));
        const result = await deps.api.search({
          workspaceId,
          query,
          limitPerGroup: 10,
        });
        const items = result.groups.facts.items
          .filter((item) => !item.readOnly)
          .map((item) => ({
            id: item.id,
            text: item.text,
            readOnly: item.readOnly,
            score: item.score,
          }));
        return { items };
      } catch {
        return {
          error: 'Memory service is currently unavailable. Proceed without memory context.',
        };
      }
    },
  }),

  tool<typeof memorySaveSchema, AgentContext>({
    name: 'memory_save',
    description: `Save a new personal fact about this user for future reference. Save preferences, interests, professional background, and ongoing project context. Only save persistent facts, not ephemeral task details like specific bugs or error messages.`,
    parameters: memorySaveSchema,
    execute: async ({ text, category }, runContext) => {
      try {
        const workspaceId = await deps.getWorkspaceId(getChatId(runContext));
        const result = await deps.api.createFact({
          workspaceId,
          text,
          categories: [category],
          metadata: { origin: 'agent_tool' },
        });
        deps.onMemoryMutated?.();
        return { id: result.id, saved: true };
      } catch {
        return {
          error: 'Failed to save memory. The conversation continues normally.',
        };
      }
    },
  }),

  tool<typeof memoryUpdateSchema, AgentContext>({
    name: 'memory_update',
    description: `Update an existing memory when the user's situation has changed. Use memory_search first to find the memory ID, then update it. Use this instead of creating duplicates.`,
    parameters: memoryUpdateSchema,
    execute: async ({ id, text }, runContext) => {
      try {
        const workspaceId = await deps.getWorkspaceId(getChatId(runContext));
        const result = await deps.api.updateFact({
          workspaceId,
          factId: id,
          text,
        });
        deps.onMemoryMutated?.();
        return { id: result.id, updated: true };
      } catch {
        return { error: 'Failed to update memory.' };
      }
    },
  }),
];
