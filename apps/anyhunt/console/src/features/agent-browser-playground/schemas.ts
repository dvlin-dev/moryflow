/**
 * [DEFINES]: 表单校验 Schema
 * [USED_BY]: components/*
 * [POS]: Agent/Browser Playground 前端表单校验
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { z } from 'zod/v3';

const jsonStringSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid JSON');

const jsonArraySchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    try {
      return Array.isArray(JSON.parse(value));
    } catch {
      return false;
    }
  }, 'Invalid JSON array');

const jsonArrayRequiredSchema = z
  .string()
  .trim()
  .min(2, 'Please provide a JSON array')
  .refine((value) => {
    try {
      return Array.isArray(JSON.parse(value));
    } catch {
      return false;
    }
  }, 'Invalid JSON array');

const jsonObjectSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    try {
      const parsed = JSON.parse(value);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }, 'Invalid JSON object');

export const flowRunnerSchema = z.object({
  targetUrl: z.string().url('Please enter a valid URL'),
  prompt: z.string().min(1, 'Please enter a prompt'),
  schemaJson: jsonStringSchema,
  maxCredits: z.coerce.number().int().positive().optional(),
});

export type FlowRunnerValues = z.infer<typeof flowRunnerSchema>;

export const browserSessionSchema = z.object({
  sessionId: z.string().trim().optional(),
  timeout: z.coerce.number().int().min(10000).max(1800000).optional(),
  viewportWidth: z.coerce.number().int().min(320).max(3840).optional(),
  viewportHeight: z.coerce.number().int().min(240).max(2160).optional(),
  device: z.string().trim().optional(),
  userAgent: z.string().trim().optional(),
  javaScriptEnabled: z.boolean(),
  ignoreHTTPSErrors: z.boolean(),
  locale: z.string().trim().optional(),
  timezoneId: z.string().trim().optional(),
  geolocationLat: z.coerce.number().min(-90).max(90).optional(),
  geolocationLng: z.coerce.number().min(-180).max(180).optional(),
  geolocationAccuracy: z.coerce.number().min(0).max(10000).optional(),
  permissionsJson: jsonArraySchema,
  colorScheme: z.enum(['light', 'dark', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  offline: z.boolean(),
  headersJson: jsonObjectSchema,
  httpUsername: z.string().trim().optional(),
  httpPassword: z.string().trim().optional(),
  acceptDownloads: z.boolean(),
  recordVideoEnabled: z.boolean(),
  recordVideoWidth: z.coerce.number().int().min(320).max(3840).optional(),
  recordVideoHeight: z.coerce.number().int().min(240).max(2160).optional(),
});

export type BrowserSessionValues = z.infer<typeof browserSessionSchema>;

export const browserOpenSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']),
  timeout: z.coerce.number().int().min(1000).max(60000).optional(),
  headersJson: jsonObjectSchema,
});

export type BrowserOpenValues = z.infer<typeof browserOpenSchema>;

export const browserSnapshotSchema = z.object({
  interactive: z.boolean(),
  compact: z.boolean(),
  maxDepth: z.coerce.number().int().min(1).max(50).optional(),
  scope: z.string().trim().optional(),
});

export type BrowserSnapshotValues = z.infer<typeof browserSnapshotSchema>;

export const browserDeltaSnapshotSchema = browserSnapshotSchema.extend({
  delta: z.boolean(),
});

export type BrowserDeltaSnapshotValues = z.infer<typeof browserDeltaSnapshotSchema>;

export const browserActionSchema = z.object({
  actionJson: z.string().trim().min(2, 'Please provide action JSON'),
});

export type BrowserActionValues = z.infer<typeof browserActionSchema>;

export const browserActionBatchSchema = z.object({
  actionsJson: jsonArrayRequiredSchema,
  stopOnError: z.boolean(),
});

export type BrowserActionBatchValues = z.infer<typeof browserActionBatchSchema>;

export const browserScreenshotSchema = z.object({
  selector: z.string().trim().optional(),
  fullPage: z.boolean(),
  format: z.enum(['png', 'jpeg']),
  quality: z.coerce.number().int().min(1).max(100).optional(),
});

export type BrowserScreenshotValues = z.infer<typeof browserScreenshotSchema>;

export const browserTabsSchema = z.object({
  tabIndex: z.coerce.number().int().min(0).optional(),
});

export type BrowserTabsValues = z.infer<typeof browserTabsSchema>;

export const browserWindowsSchema = z.object({
  windowIndex: z.coerce.number().int().min(0).optional(),
  viewportWidth: z.coerce.number().int().min(320).max(3840).optional(),
  viewportHeight: z.coerce.number().int().min(240).max(2160).optional(),
  device: z.string().trim().optional(),
  userAgent: z.string().trim().optional(),
  locale: z.string().trim().optional(),
  timezoneId: z.string().trim().optional(),
  geolocationLat: z.coerce.number().min(-90).max(90).optional(),
  geolocationLng: z.coerce.number().min(-180).max(180).optional(),
  geolocationAccuracy: z.coerce.number().min(0).max(10000).optional(),
  permissionsJson: jsonArraySchema,
  colorScheme: z.enum(['light', 'dark', 'no-preference']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference']).optional(),
  offline: z.boolean(),
  headersJson: jsonObjectSchema,
  httpUsername: z.string().trim().optional(),
  httpPassword: z.string().trim().optional(),
  acceptDownloads: z.boolean(),
  recordVideoEnabled: z.boolean(),
  recordVideoWidth: z.coerce.number().int().min(320).max(3840).optional(),
  recordVideoHeight: z.coerce.number().int().min(240).max(2160).optional(),
});

export type BrowserWindowsValues = z.infer<typeof browserWindowsSchema>;

export const browserInterceptSchema = z.object({
  rulesJson: jsonStringSchema,
  ruleJson: jsonStringSchema,
  ruleId: z.string().trim().optional(),
});

export type BrowserInterceptValues = z.infer<typeof browserInterceptSchema>;

export const browserHeadersSchema = z.object({
  origin: z.string().trim().optional(),
  headersJson: jsonObjectSchema,
  clearGlobal: z.boolean(),
});

export type BrowserHeadersValues = z.infer<typeof browserHeadersSchema>;

export const browserNetworkHistorySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  urlFilter: z.string().trim().optional(),
});

export type BrowserNetworkHistoryValues = z.infer<typeof browserNetworkHistorySchema>;

export const browserDiagnosticsLogSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export type BrowserDiagnosticsLogValues = z.infer<typeof browserDiagnosticsLogSchema>;

export const browserDiagnosticsTraceSchema = z.object({
  screenshots: z.boolean(),
  snapshots: z.boolean(),
  store: z.boolean(),
});

export type BrowserDiagnosticsTraceValues = z.infer<typeof browserDiagnosticsTraceSchema>;

export const browserDiagnosticsHarSchema = z.object({
  clear: z.boolean(),
  includeRequests: z.boolean(),
});

export type BrowserDiagnosticsHarValues = z.infer<typeof browserDiagnosticsHarSchema>;

export const browserStorageSchema = z.object({
  exportOptionsJson: jsonStringSchema,
  importDataJson: jsonStringSchema,
});

export type BrowserStorageValues = z.infer<typeof browserStorageSchema>;

export const browserProfileSchema = z.object({
  profileId: z.string().trim().optional(),
  includeSessionStorage: z.boolean(),
  loadProfileId: z.string().trim().optional(),
});

export type BrowserProfileValues = z.infer<typeof browserProfileSchema>;

export const browserStreamSchema = z.object({
  expiresIn: z.coerce.number().int().min(30).max(3600).optional(),
});

export type BrowserStreamValues = z.infer<typeof browserStreamSchema>;

export const browserCdpSchema = z
  .object({
    wsEndpoint: z.string().trim().optional(),
    port: z.coerce.number().int().min(1).max(65535).optional(),
    timeout: z.coerce.number().int().min(1000).max(60000).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.wsEndpoint?.trim() && !value.port) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wsEndpoint'],
        message: 'Please provide wsEndpoint or port',
      });
    }
  });

export type BrowserCdpValues = z.infer<typeof browserCdpSchema>;

export const agentPromptSchema = z.object({
  message: z.string().trim().min(1, 'Please enter a prompt'),
});

export type AgentPromptValues = z.infer<typeof agentPromptSchema>;
