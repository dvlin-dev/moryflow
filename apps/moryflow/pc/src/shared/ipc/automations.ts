import {
  automationDeliverySchema,
  automationExecutionPolicySchema,
  automationJobSchema,
  automationPayloadSchema,
  automationRunRecordSchema,
  automationScheduleSchema,
} from '@moryflow/automations-core';
import type { AutomationJob, AutomationRunRecord } from '@moryflow/automations-core';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);

export const automationCreateSourceSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('conversation-session'),
      sessionId: nonEmptyStringSchema,
      vaultPath: nonEmptyStringSchema,
      displayTitle: nonEmptyStringSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('automation-context'),
      vaultPath: nonEmptyStringSchema,
      displayTitle: nonEmptyStringSchema,
    })
    .strict(),
]);

export const automationCreateInputSchema = z
  .object({
    name: nonEmptyStringSchema,
    enabled: z.boolean().default(true),
    source: automationCreateSourceSchema,
    schedule: automationScheduleSchema,
    payload: automationPayloadSchema,
    delivery: automationDeliverySchema,
    executionPolicy: automationExecutionPolicySchema,
  })
  .strict();

export const automationJobIdInputSchema = z
  .object({
    jobId: nonEmptyStringSchema,
  })
  .strict();

export const automationToggleInputSchema = z
  .object({
    jobId: nonEmptyStringSchema,
    enabled: z.boolean(),
  })
  .strict();

export const automationListRunsInputSchema = z
  .object({
    jobId: nonEmptyStringSchema.optional(),
    limit: z.number().int().positive().max(200).optional(),
  })
  .strict();

export const automationStatusChangeEventSchema = z
  .object({
    occurredAt: z.number().int().nonnegative(),
  })
  .strict();

export type AutomationCreateSourceInput = z.infer<typeof automationCreateSourceSchema>;
export type AutomationCreateInput = z.infer<typeof automationCreateInputSchema>;
export type AutomationJobIdInput = z.infer<typeof automationJobIdInputSchema>;
export type AutomationToggleInput = z.infer<typeof automationToggleInputSchema>;
export type AutomationListRunsInput = z.infer<typeof automationListRunsInputSchema>;
export type AutomationStatusChangeEvent = z.infer<typeof automationStatusChangeEventSchema>;

export { automationJobSchema, automationRunRecordSchema };

export type { AutomationJob, AutomationRunRecord };
