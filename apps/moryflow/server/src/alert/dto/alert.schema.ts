/**
 * Alert DTOs - Zod Schemas
 * 告警相关数据传输对象
 *
 * [DEFINES]: Alert rule and history schemas
 * [USED_BY]: AlertService, AdminAlertController
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AlertRuleType, AlertLevel } from '../../../generated/prisma/client';

// ==========================================
// Enums
// ==========================================

export const AlertMetricSchema = z.enum([
  'failure_rate',
  'consecutive_failures',
  'count',
]);

export const AlertOperatorSchema = z.enum(['gt', 'gte', 'lt', 'lte', 'eq']);

export const AlertChannelSchema = z.enum(['email']);

// ==========================================
// Rule Condition & Action
// ==========================================

export const AlertRuleConditionSchema = z.object({
  metric: AlertMetricSchema,
  operator: AlertOperatorSchema,
  threshold: z.number(),
  timeWindow: z.number().int().positive(),
  minCount: z.number().int().positive().optional(),
});

export type AlertRuleCondition = z.infer<typeof AlertRuleConditionSchema>;

export const AlertRuleActionSchema = z.object({
  channel: AlertChannelSchema,
  target: z.string().email('Invalid email address'),
});

export type AlertRuleAction = z.infer<typeof AlertRuleActionSchema>;

// ==========================================
// Create Rule
// ==========================================

export const CreateAlertRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.nativeEnum(AlertRuleType),
  level: z.nativeEnum(AlertLevel).optional(),
  condition: AlertRuleConditionSchema,
  actions: z
    .array(AlertRuleActionSchema)
    .min(1, 'At least one action required'),
  cooldown: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export class CreateAlertRuleDto extends createZodDto(CreateAlertRuleSchema) {}

// ==========================================
// Update Rule
// ==========================================

export const UpdateAlertRuleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(AlertRuleType).optional(),
  level: z.nativeEnum(AlertLevel).optional(),
  condition: AlertRuleConditionSchema.optional(),
  actions: z.array(AlertRuleActionSchema).min(1).optional(),
  cooldown: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export class UpdateAlertRuleDto extends createZodDto(UpdateAlertRuleSchema) {}

// ==========================================
// Query DTOs
// ==========================================

export const GetAlertRulesQuerySchema = z.object({
  type: z.nativeEnum(AlertRuleType).optional(),
  enabled: z
    .string()
    .optional()
    .transform((v) =>
      v === 'true' ? true : v === 'false' ? false : undefined,
    ),
});

export class GetAlertRulesQueryDto extends createZodDto(
  GetAlertRulesQuerySchema,
) {}

export const GetAlertHistoryQuerySchema = z.object({
  ruleId: z.string().optional(),
  level: z.nativeEnum(AlertLevel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : 50)),
  offset: z
    .string()
    .optional()
    .transform((v) => (v ? Math.max(parseInt(v, 10), 0) : 0)),
});

export class GetAlertHistoryQueryDto extends createZodDto(
  GetAlertHistoryQuerySchema,
) {}

// ==========================================
// Alert Context
// ==========================================

export const AlertContextSchema = z.object({
  toolName: z.string().optional(),
  agentName: z.string().optional(),
  value: z.number(),
  threshold: z.number(),
  message: z.string(),
});

export type AlertContext = z.infer<typeof AlertContextSchema>;
