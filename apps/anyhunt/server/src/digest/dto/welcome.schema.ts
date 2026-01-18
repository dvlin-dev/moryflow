/**
 * Digest Welcome Schemas
 *
 * [DEFINES]: Welcome config/page schemas (admin/public)
 * [USED_BY]: digest-public-welcome*.controller.ts, digest-admin-welcome*.controller.ts
 */

import { z } from 'zod';

export const WelcomeActionSchema = z.object({
  labelByLocale: z.record(z.string(), z.string()),
  action: z.enum(['openExplore', 'openSignIn']),
});

export const PublicWelcomeQuerySchema = z.object({
  locale: z.string().optional(),
});

export type PublicWelcomeQuery = z.infer<typeof PublicWelcomeQuerySchema>;

export const UpdateWelcomeConfigSchema = z.object({
  enabled: z.boolean(),
  defaultSlug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
  primaryAction: WelcomeActionSchema.nullable().optional(),
  secondaryAction: WelcomeActionSchema.nullable().optional(),
});

export type UpdateWelcomeConfigInput = z.infer<
  typeof UpdateWelcomeConfigSchema
>;

export type WelcomeActionInput = z.infer<typeof WelcomeActionSchema>;

const WelcomeLocaleRecordSchema = z.record(z.string(), z.string());

export const CreateWelcomePageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().min(0).optional(),
  titleByLocale: WelcomeLocaleRecordSchema,
  contentMarkdownByLocale: WelcomeLocaleRecordSchema,
});

export type CreateWelcomePageInput = z.infer<typeof CreateWelcomePageSchema>;

export const UpdateWelcomePageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
  titleByLocale: WelcomeLocaleRecordSchema,
  contentMarkdownByLocale: WelcomeLocaleRecordSchema,
});

export type UpdateWelcomePageInput = z.infer<typeof UpdateWelcomePageSchema>;

export const ReorderWelcomePagesSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export type ReorderWelcomePagesInput = z.infer<
  typeof ReorderWelcomePagesSchema
>;
