/**
 * Extract API DTO validation schemas
 *
 * [INPUT]: Request body validation using Zod
 * [OUTPUT]: Type-safe DTOs inferred from schemas
 * [POS]: Used by extract.controller.ts for request validation
 *
 * [PROTOCOL]: When this file changes, you MUST update this header and the directory CLAUDE.md
 */
import { z } from 'zod';

/**
 * Extract API request parameters schema
 */
export const ExtractOptionsSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20),
  prompt: z.string().max(5000).optional(),
  schema: z.record(z.string(), z.unknown()).optional(), // JSON Schema
  systemPrompt: z.string().max(2000).optional(),
  /** Optional: Specify LLM model (defaults to OPENAI_DEFAULT_MODEL from env) */
  model: z.string().max(100).optional(),
});

export type ExtractOptions = z.infer<typeof ExtractOptionsSchema>;
