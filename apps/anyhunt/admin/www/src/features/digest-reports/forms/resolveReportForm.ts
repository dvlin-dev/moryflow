/**
 * [PROVIDES]: resolve report form schema/defaults/mappers
 * [DEPENDS]: zod/v3 + digest reports types
 * [POS]: Digest reports resolve dialog form domain
 */

import { z } from 'zod/v3';
import type { ResolveReportInput } from '../types';

export const resolveReportFormSchema = z.object({
  status: z.enum(['RESOLVED_VALID', 'RESOLVED_INVALID', 'DISMISSED'] as const),
  resolveNote: z.string().max(500).optional(),
  pauseTopic: z.boolean(),
});

export type ResolveReportFormValues = z.infer<typeof resolveReportFormSchema>;

export const resolveReportFormDefaultValues: ResolveReportFormValues = {
  status: 'RESOLVED_VALID',
  resolveNote: '',
  pauseTopic: false,
};

export function toResolveReportInput(values: ResolveReportFormValues): ResolveReportInput {
  return {
    status: values.status,
    resolveNote: values.resolveNote || undefined,
    pauseTopic: values.pauseTopic,
  };
}
