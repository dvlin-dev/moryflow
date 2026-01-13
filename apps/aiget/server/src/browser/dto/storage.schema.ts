/**
 * Storage Schema - 会话持久化
 *
 * [DEFINES]: ExportStorageSchema, ImportStorageSchema, StorageExportResult
 * [USED_BY]: browser-session.controller.ts, storage.service.ts
 * [POS]: 会话存储导入导出的请求验证
 */

import { z } from 'zod';

/** 存储导出选项 */
const StorageIncludeSchema = z.object({
  cookies: z.boolean().default(true),
  localStorage: z.boolean().default(true),
  sessionStorage: z.boolean().default(false),
});

/** 导出存储请求 */
export const ExportStorageSchema = z.object({
  /** 要导出的内容 */
  include: StorageIncludeSchema.default({
    cookies: true,
    localStorage: true,
    sessionStorage: false,
  }),
  /** 过滤域名（可选，不设置则导出所有） */
  domains: z.array(z.string()).optional(),
});

export type ExportStorageInput = z.infer<typeof ExportStorageSchema>;

/** Cookie Schema */
const CookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string().default('/'),
  expires: z.number().optional(),
  httpOnly: z.boolean().default(false),
  secure: z.boolean().default(false),
  sameSite: z.enum(['Strict', 'Lax', 'None']).default('Lax'),
});

/** 导入存储请求 */
export const ImportStorageSchema = z.object({
  /** Cookies */
  cookies: z.array(CookieSchema).optional(),
  /** LocalStorage 数据（按域名组织） */
  localStorage: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional(),
  /** SessionStorage 数据（按域名组织） */
  sessionStorage: z
    .record(z.string(), z.record(z.string(), z.string()))
    .optional(),
});

export type ImportStorageInput = z.infer<typeof ImportStorageSchema>;

/** Cookie 导出类型 */
export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

/** 存储导出结果 */
export interface StorageExportResult {
  cookies: CookieData[];
  localStorage: Record<string, Record<string, string>>;
  sessionStorage?: Record<string, Record<string, string>>;
  exportedAt: string;
}
