/**
 * Admin Site DTOs
 * 管理员站点管理相关的请求和响应数据结构
 *
 * [DEFINES]: Admin site query, update, and response schemas
 * [USED_BY]: AdminSiteController, AdminSiteService
 */

import { z } from 'zod';
import {
  PAGINATION_MAX_LIMIT,
  PAGINATION_DEFAULT_LIMIT,
} from '../dto/admin.dto';

// ==================== 枚举常量 ====================

export const SiteStatusEnum = ['ACTIVE', 'OFFLINE'] as const;
export const SiteTypeEnum = ['MARKDOWN', 'GENERATED'] as const;
export const SubscriptionTierEnum = [
  'free',
  'starter',
  'basic',
  'pro',
  'license',
] as const;
export const ExpiryFilterEnum = ['expiring', 'expired'] as const;

// ==================== Request Schemas ====================

/**
 * 站点列表查询参数
 */
export const AdminSiteListQuerySchema = z.object({
  // 搜索：子域名、标题、用户邮箱
  search: z.string().optional(),

  // 筛选条件
  status: z.enum(SiteStatusEnum).optional(),
  type: z.enum(SiteTypeEnum).optional(),
  userTier: z.enum(SubscriptionTierEnum).optional(),
  expiryFilter: z.enum(ExpiryFilterEnum).optional(),

  // 分页
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : PAGINATION_DEFAULT_LIMIT;
      return Math.min(Math.max(n, 1), PAGINATION_MAX_LIMIT);
    }),
  offset: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? parseInt(v, 10) : 0;
      return Math.max(n, 0);
    }),
});

export type AdminSiteListQueryDto = z.infer<typeof AdminSiteListQuerySchema>;

/**
 * 更新站点配置请求
 */
export const AdminSiteUpdateSchema = z.object({
  // 修改过期时间
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : v)),

  // 修改水印开关
  showWatermark: z.boolean().optional(),
});

export type AdminSiteUpdateDto = z.infer<typeof AdminSiteUpdateSchema>;

// ==================== Response Schemas ====================

/**
 * 站点所有者信息
 */
export const SiteOwnerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  tier: z.string(),
  createdAt: z.date(),
});

export type SiteOwnerDto = z.infer<typeof SiteOwnerSchema>;

/**
 * 站点列表项
 */
export const AdminSiteListItemSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  showWatermark: z.boolean(),
  publishedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  url: z.string(),
  pageCount: z.number().int(),
  owner: SiteOwnerSchema,
});

export type AdminSiteListItemDto = z.infer<typeof AdminSiteListItemSchema>;

/**
 * 分页信息
 */
export const PaginationSchema = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;

/**
 * 站点列表响应
 */
export const AdminSiteListResponseSchema = z.object({
  sites: z.array(AdminSiteListItemSchema),
  pagination: PaginationSchema,
});

export type AdminSiteListResponseDto = z.infer<
  typeof AdminSiteListResponseSchema
>;

/**
 * 站点页面信息
 */
export const SitePageSchema = z.object({
  id: z.string(),
  path: z.string(),
  title: z.string().nullable(),
  localFilePath: z.string().nullable(),
  localFileHash: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SitePageDto = z.infer<typeof SitePageSchema>;

/**
 * 站点详情响应
 */
export const AdminSiteDetailSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  type: z.string(),
  status: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  favicon: z.string().nullable(),
  showWatermark: z.boolean(),
  publishedAt: z.date().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  url: z.string(),
  owner: SiteOwnerSchema,
  pages: z.array(SitePageSchema),
});

export type AdminSiteDetailDto = z.infer<typeof AdminSiteDetailSchema>;

/**
 * 站点统计数据
 */
export const AdminSiteStatsSchema = z.object({
  total: z.number().int(),
  byStatus: z.object({
    active: z.number().int(),
    offline: z.number().int(),
  }),
  byType: z.object({
    markdown: z.number().int(),
    generated: z.number().int(),
  }),
  /** 7天内过期 */
  expiringSoon: z.number().int(),
  expired: z.number().int(),
});

export type AdminSiteStatsDto = z.infer<typeof AdminSiteStatsSchema>;
