/**
 * [PROVIDES]: Memox Playground 表单 schemas/defaults/types
 * [DEPENDS]: zod/v3
 * [POS]: Memox Playground 表单层共享定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { z } from 'zod/v3';

export type MemoxPlaygroundTab = 'create' | 'search';

export const createMemorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
  agent_id: z.string().optional(),
  app_id: z.string().optional(),
  run_id: z.string().optional(),
  metadata: z.string().optional(),
  includes: z.string().optional(),
  excludes: z.string().optional(),
  custom_instructions: z.string().optional(),
  custom_categories: z.string().optional(),
  infer: z.boolean().default(true),
  async_mode: z.boolean().default(true),
  output_format: z.enum(['v1.0', 'v1.1']).default('v1.1'),
  enable_graph: z.boolean().default(false),
});

export type CreateMemoryFormInput = z.input<typeof createMemorySchema>;
export type CreateMemoryFormValues = z.infer<typeof createMemorySchema>;

export const createMemoryDefaults: CreateMemoryFormInput = {
  user_id: '',
  message: '',
  agent_id: '',
  app_id: '',
  run_id: '',
  metadata: '',
  includes: '',
  excludes: '',
  custom_instructions: '',
  custom_categories: '',
  infer: true,
  async_mode: true,
  output_format: 'v1.1',
  enable_graph: false,
};

export const searchMemorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  query: z.string().min(1, 'Query is required'),
  top_k: z.coerce.number().min(1).max(100).default(10),
  threshold: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().min(0).max(1).optional()
  ),
  output_format: z.enum(['v1.0', 'v1.1']).default('v1.1'),
  keyword_search: z.boolean().default(false),
  rerank: z.boolean().default(false),
  filter_memories: z.boolean().default(false),
  only_metadata_based_search: z.boolean().default(false),
  metadata: z.string().optional(),
  filters: z.string().optional(),
  categories: z.string().optional(),
});

export type SearchMemoryFormInput = z.input<typeof searchMemorySchema>;
export type SearchMemoryFormValues = z.infer<typeof searchMemorySchema>;

export const searchMemoryDefaults: SearchMemoryFormInput = {
  user_id: '',
  query: '',
  top_k: 10,
  threshold: undefined,
  output_format: 'v1.1',
  keyword_search: false,
  rerank: false,
  filter_memories: false,
  only_metadata_based_search: false,
  metadata: '',
  filters: '',
  categories: '',
};
