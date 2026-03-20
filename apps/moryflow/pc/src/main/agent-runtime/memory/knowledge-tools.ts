/**
 * [PROVIDES]: createKnowledgeTools - knowledge_search / knowledge_read agent tools
 * [DEPENDS]: @openai/agents-core, zod, memory/api/client
 * [POS]: PC Agent Runtime knowledge tool factory
 */

import { tool } from '@openai/agents-core';
import type { RunContext, Tool } from '@openai/agents-core';
import { z } from 'zod';
import type { AgentContext } from '@moryflow/agents-runtime';
import type { MemoryToolDeps } from './memory-tools.js';
import type { KnowledgeReadInput, KnowledgeReadOutput } from '../../../shared/ipc/memory.js';

export type KnowledgeToolDeps = MemoryToolDeps & {
  readWorkspaceFile?: (input: KnowledgeReadInput, chatId?: string) => Promise<KnowledgeReadOutput>;
};

const knowledgeSearchSchema = z.object({
  query: z.string().min(1).describe('Search query to find relevant files and knowledge'),
});

const knowledgeReadSchema = z
  .object({
    documentId: z
      .string()
      .min(1)
      .optional()
      .describe('Document ID from knowledge_search results (preferred)'),
    path: z
      .string()
      .min(1)
      .optional()
      .describe('Relative file path, used only if documentId is unavailable'),
    offsetChars: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Start reading from this character offset'),
    maxChars: z
      .number()
      .int()
      .min(1)
      .max(50000)
      .optional()
      .describe('Maximum characters to return, default 20000'),
  })
  .refine((data) => data.documentId || data.path, {
    message: 'Either documentId or path must be provided',
  });

export const createKnowledgeTools = (deps: KnowledgeToolDeps): Tool<AgentContext>[] => {
  const tools: Tool<AgentContext>[] = [
    tool<typeof knowledgeSearchSchema, AgentContext>({
      name: 'knowledge_search',
      description:
        "Search the user's workspace files for relevant knowledge. Use when the user asks about their own content, needs references from their files, or when file context would improve your answer. Search proactively when the topic relates to the user's workspace. Use knowledge_read with the returned documentId to get full file content when the snippet is not enough.",
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
            documentId: item.documentId,
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

  if (deps.readWorkspaceFile) {
    const readFile = deps.readWorkspaceFile;
    tools.push(
      tool<typeof knowledgeReadSchema, AgentContext>({
        name: 'knowledge_read',
        description:
          'Read the full content of a workspace file by documentId (from knowledge_search results). Use when a snippet is not enough and you need the complete file content. If the file is large, use offsetChars and maxChars for paginated reading. Prefer documentId over path.',
        parameters: knowledgeReadSchema,
        execute: async (
          { documentId, path, offsetChars, maxChars },
          runContext?: RunContext<AgentContext>
        ) => {
          try {
            const result = await readFile(
              {
                documentId,
                path,
                offsetChars,
                maxChars,
              },
              runContext?.context?.chatId
            );
            return {
              content: result.content,
              truncated: result.truncated,
              nextOffset: result.nextOffset,
              relativePath: result.relativePath,
              totalBytes: result.totalBytes,
            };
          } catch {
            return { error: 'File reading is currently unavailable.' };
          }
        },
      })
    );
  }

  return tools;
};
