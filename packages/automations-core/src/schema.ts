import type { AgentInputItem } from '@openai/agents-core';
import type { ThinkingSelection, ToolPolicy } from '@moryflow/agents-runtime';
import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const timestampMsSchema = z.number().int().nonnegative();
const EMPTY_TOOL_POLICY: ToolPolicy = { allow: [] };

const agentInputItemSchema = z.custom<AgentInputItem>(() => true);

export const automationThinkingSelectionSchema = z.union([
  z.object({ mode: z.literal('off') }).strict(),
  z
    .object({
      mode: z.literal('level'),
      level: nonEmptyStringSchema,
    })
    .strict(),
]) as z.ZodType<ThinkingSelection>;

export const automationContextRecordSchema = z
  .object({
    id: nonEmptyStringSchema,
    vaultPath: nonEmptyStringSchema,
    title: nonEmptyStringSchema,
    history: z.array(agentInputItemSchema),
    createdAt: timestampMsSchema,
    updatedAt: timestampMsSchema,
  })
  .strict();

const automationSourceBaseSchema = z
  .object({
    origin: z.enum(['conversation-entry', 'automations-module']),
    vaultPath: nonEmptyStringSchema,
    displayTitle: nonEmptyStringSchema,
  })
  .strict();

export const automationSourceSchema = z.discriminatedUnion('kind', [
  automationSourceBaseSchema
    .extend({
      kind: z.literal('conversation-session'),
      sessionId: nonEmptyStringSchema,
    })
    .strict(),
  automationSourceBaseSchema
    .extend({
      kind: z.literal('automation-context'),
      contextId: nonEmptyStringSchema,
    })
    .strict(),
]);

export const automationScheduleSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('at'),
      runAt: timestampMsSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('every'),
      intervalMs: z.number().int().positive(),
    })
    .strict(),
]);

export const automationPayloadSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('agent-turn'),
      message: nonEmptyStringSchema,
      modelId: nonEmptyStringSchema.optional(),
      thinking: automationThinkingSelectionSchema.optional(),
      contextDepth: z.number().int().min(0).default(6),
      contextSummary: nonEmptyStringSchema.optional(),
    })
    .strict(),
]);

export const automationDeliverySchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('none'),
    })
    .strict(),
  z
    .object({
      mode: z.literal('push'),
      endpointId: nonEmptyStringSchema,
      failureEndpointId: nonEmptyStringSchema.optional(),
      bestEffort: z.boolean().optional(),
    })
    .strict(),
]);

export const automationEndpointTargetSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('telegram'),
      chatId: nonEmptyStringSchema,
      threadId: nonEmptyStringSchema.optional(),
      peerKey: nonEmptyStringSchema,
      threadKey: nonEmptyStringSchema,
      username: nonEmptyStringSchema.optional(),
      title: nonEmptyStringSchema.optional(),
    })
    .strict(),
]);

export const automationEndpointSchema = z
  .object({
    id: nonEmptyStringSchema,
    channel: z.literal('telegram'),
    accountId: nonEmptyStringSchema,
    label: nonEmptyStringSchema,
    target: automationEndpointTargetSchema,
    verifiedAt: z.string().datetime().optional(),
    lastUsedAt: z.string().datetime().optional(),
    replySessionId: nonEmptyStringSchema,
  })
  .strict();

export const automationNetworkPolicySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('inherit') }).strict(),
  z.object({ mode: z.literal('deny') }).strict(),
  z
    .object({
      mode: z.literal('allowlist'),
      allowHosts: z.array(nonEmptyStringSchema).min(1),
    })
    .strict(),
]);

export const automationFileSystemPolicySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('inherit') }).strict(),
  z.object({ mode: z.literal('deny') }).strict(),
  z.object({ mode: z.literal('vault_only') }).strict(),
  z
    .object({
      mode: z.literal('allowlist'),
      allowPaths: z.array(nonEmptyStringSchema).min(1),
    })
    .strict(),
]);

const automationToolPolicyRuleSchema = z.discriminatedUnion('tool', [
  z
    .object({
      tool: z.enum(['Read', 'Edit', 'WebFetch', 'WebSearch', 'Mcp']),
    })
    .strict(),
  z
    .object({
      tool: z.literal('Bash'),
      commandPattern: nonEmptyStringSchema.refine((value) => value.includes(':'), {
        error: 'Bash commandPattern must contain a family separator.',
      }),
    })
    .strict(),
]);

export const automationToolPolicySchema = z
  .object({
    allow: z.array(automationToolPolicyRuleSchema),
  })
  .strict()
  .transform((policy) => {
    const signatures = new Set<string>();
    const normalized = policy.allow.filter((rule) => {
      const signature =
        rule.tool === 'Bash' ? `${rule.tool}:${rule.commandPattern.trim()}` : rule.tool;
      if (signatures.has(signature)) {
        return false;
      }
      signatures.add(signature);
      return true;
    });
    return { allow: normalized } satisfies ToolPolicy;
  })
  .default(EMPTY_TOOL_POLICY);

export const automationExecutionPolicySchema = z
  .object({
    approvalMode: z.literal('unattended'),
    toolPolicy: automationToolPolicySchema,
    networkPolicy: automationNetworkPolicySchema,
    fileSystemPolicy: automationFileSystemPolicySchema,
    requiresExplicitConfirmation: z.boolean(),
  })
  .strict();

export const automationJobStateSchema = z
  .object({
    nextRunAt: timestampMsSchema.optional(),
    runningAt: timestampMsSchema.optional(),
    lastRunAt: timestampMsSchema.optional(),
    lastRunStatus: z.enum(['ok', 'error', 'skipped']).optional(),
    lastError: nonEmptyStringSchema.optional(),
    lastDurationMs: z.number().int().nonnegative().optional(),
    consecutiveErrors: z.number().int().nonnegative().optional(),
    lastDeliveryStatus: z
      .enum(['delivered', 'not-delivered', 'unknown', 'not-requested'])
      .optional(),
    lastDeliveryError: nonEmptyStringSchema.optional(),
    lastWarningCode: z.enum(['source_missing']).optional(),
    lastWarningMessage: nonEmptyStringSchema.optional(),
  })
  .strict();

export const automationJobSchema = z
  .object({
    id: nonEmptyStringSchema,
    name: nonEmptyStringSchema,
    enabled: z.boolean(),
    source: automationSourceSchema,
    schedule: automationScheduleSchema,
    payload: automationPayloadSchema,
    delivery: automationDeliverySchema,
    executionPolicy: automationExecutionPolicySchema,
    state: automationJobStateSchema,
    createdAt: timestampMsSchema,
    updatedAt: timestampMsSchema,
  })
  .strict();

export const automationRunRecordSchema = z
  .object({
    id: nonEmptyStringSchema,
    jobId: nonEmptyStringSchema,
    startedAt: timestampMsSchema,
    finishedAt: timestampMsSchema,
    status: z.enum(['ok', 'error', 'skipped']),
    outputText: z.string().optional(),
    errorMessage: z.string().optional(),
    warningCode: z.enum(['source_missing']).optional(),
    warningMessage: z.string().optional(),
  })
  .strict();

export type AutomationThinkingSelection = z.infer<typeof automationThinkingSelectionSchema>;
export type AutomationContextRecord = z.infer<typeof automationContextRecordSchema>;
export type AutomationSource = z.infer<typeof automationSourceSchema>;
export type AutomationSchedule = z.infer<typeof automationScheduleSchema>;
export type AutomationPayload = z.infer<typeof automationPayloadSchema>;
export type AutomationDelivery = z.infer<typeof automationDeliverySchema>;
export type AutomationEndpointTarget = z.infer<typeof automationEndpointTargetSchema>;
export type AutomationEndpoint = z.infer<typeof automationEndpointSchema>;
export type AutomationNetworkPolicy = z.infer<typeof automationNetworkPolicySchema>;
export type AutomationFileSystemPolicy = z.infer<typeof automationFileSystemPolicySchema>;
export type AutomationExecutionPolicy = z.infer<typeof automationExecutionPolicySchema>;
export type AutomationJobState = z.infer<typeof automationJobStateSchema>;
export type AutomationJob = z.infer<typeof automationJobSchema>;
export type AutomationRunRecord = z.infer<typeof automationRunRecordSchema>;
