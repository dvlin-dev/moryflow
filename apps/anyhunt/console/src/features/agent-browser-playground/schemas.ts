/**
 * [DEFINES]: 表单校验 Schema
 * [USED_BY]: components/*
 * [POS]: Agent/Browser Playground 前端表单校验
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

const urlListSchema = z
  .string()
  .trim()
  .optional()
  .refine((value) => {
    if (!value) return true;
    const urls = value
      .split(/[\s,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return urls.every((item) => {
      try {
        new URL(item);
        return true;
      } catch {
        return false;
      }
    });
  }, 'Invalid URL list');

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
  userAgent: z.string().trim().optional(),
  javaScriptEnabled: z.boolean(),
  ignoreHTTPSErrors: z.boolean(),
});

export type BrowserSessionValues = z.infer<typeof browserSessionSchema>;

export const browserOpenSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']),
  timeout: z.coerce.number().int().min(1000).max(60000).optional(),
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

export const browserScreenshotSchema = z.object({
  selector: z.string().trim().optional(),
  fullPage: z.boolean(),
  format: z.enum(['png', 'jpeg', 'webp']),
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
  userAgent: z.string().trim().optional(),
});

export type BrowserWindowsValues = z.infer<typeof browserWindowsSchema>;

export const browserInterceptSchema = z.object({
  rulesJson: jsonStringSchema,
  ruleJson: jsonStringSchema,
  ruleId: z.string().trim().optional(),
});

export type BrowserInterceptValues = z.infer<typeof browserInterceptSchema>;

export const browserNetworkHistorySchema = z.object({
  limit: z.coerce.number().int().positive().optional(),
  urlFilter: z.string().trim().optional(),
});

export type BrowserNetworkHistoryValues = z.infer<typeof browserNetworkHistorySchema>;

export const browserStorageSchema = z.object({
  exportOptionsJson: jsonStringSchema,
  importDataJson: jsonStringSchema,
});

export type BrowserStorageValues = z.infer<typeof browserStorageSchema>;

export const browserCdpSchema = z.object({
  wsEndpoint: z.string().trim().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  timeout: z.coerce.number().int().min(1000).max(60000).optional(),
});

export type BrowserCdpValues = z.infer<typeof browserCdpSchema>;

export const agentOptionsSchema = z.object({
  urls: urlListSchema,
  schemaJson: jsonStringSchema,
  maxCredits: z.coerce.number().int().positive().optional(),
});

export type AgentOptionsValues = z.infer<typeof agentOptionsSchema>;

export const agentPromptSchema = z.object({
  prompt: z.string().trim().min(1, 'Please enter a prompt'),
});

export type AgentPromptValues = z.infer<typeof agentPromptSchema>;
