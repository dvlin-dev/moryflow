/**
 * [PROVIDES]: embedFormSchema, embedFormDefaults, buildEmbedRequest
 * [DEPENDS]: zod/v3, embed-playground types
 * [POS]: Embed Playground 表单 schema 与请求映射
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { z } from 'zod/v3';
import type { EmbedFormData } from './types';

const DIMENSION_MIN = 1;
const DIMENSION_MAX = 4096;

const optionalDimensionSchema = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) {
      return true;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= DIMENSION_MIN && parsed <= DIMENSION_MAX;
  }, `Enter an integer between ${DIMENSION_MIN} and ${DIMENSION_MAX}`);

export const embedFormSchema = z.object({
  url: z.string().trim().url('Enter a valid URL'),
  maxWidth: optionalDimensionSchema,
  maxHeight: optionalDimensionSchema,
  theme: z.enum(['auto', 'light', 'dark']),
});

export type EmbedFormInput = z.input<typeof embedFormSchema>;
export type EmbedFormValues = z.infer<typeof embedFormSchema>;

export const embedFormDefaults: EmbedFormInput = {
  url: '',
  maxWidth: '550',
  maxHeight: '',
  theme: 'auto',
};

function parseOptionalDimension(value: string): number | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return Number(trimmed);
}

export function buildEmbedRequest(values: EmbedFormValues): EmbedFormData {
  return {
    url: values.url.trim(),
    maxWidth: parseOptionalDimension(values.maxWidth),
    maxHeight: parseOptionalDimension(values.maxHeight),
    theme: values.theme === 'auto' ? undefined : values.theme,
  };
}
