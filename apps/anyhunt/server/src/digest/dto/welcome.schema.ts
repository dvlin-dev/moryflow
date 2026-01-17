/**
 * Digest Welcome Schemas
 *
 * [DEFINES]: WelcomeConfig DTO schemas
 * [USED_BY]: digest-public-welcome.controller.ts, digest-admin-welcome.controller.ts
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

export const UpdateWelcomeSchema = z.object({
  enabled: z.boolean(),
  titleByLocale: z.record(z.string(), z.string()),
  contentMarkdownByLocale: z.record(z.string(), z.string()),
  primaryAction: WelcomeActionSchema.nullable().optional(),
  secondaryAction: WelcomeActionSchema.nullable().optional(),
});

export type UpdateWelcomeInput = z.infer<typeof UpdateWelcomeSchema>;

export type WelcomeActionInput = z.infer<typeof WelcomeActionSchema>;
