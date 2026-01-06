/**
 * [DEFINES]: 用户管理 DTO schemas
 * [USED_BY]: UsersController, UsersService
 * [POS]: 用户管理 Zod schemas 和类型
 *
 * [PROTOCOL]: 本文件变更时，需同步更新 CLAUDE.md
 */

import { z } from 'zod';

// 订阅等级枚举
export const SubscriptionTierSchema = z.enum(['FREE', 'STARTER', 'PRO', 'MAX']);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

// 用户列表查询参数
export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tier: SubscriptionTierSchema.optional(),
  isAdmin: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : v),
    z.boolean().optional()
  ),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

// 设置等级请求
export const SetTierInputSchema = z.object({
  tier: SubscriptionTierSchema,
  reason: z.string().min(1).max(500),
});
export type SetTierInput = z.infer<typeof SetTierInputSchema>;

// 发放积分请求
export const GrantCreditsInputSchema = z.object({
  amount: z.number().int().min(1).max(1000000),
  reason: z.string().min(1).max(500),
});
export type GrantCreditsInput = z.infer<typeof GrantCreditsInputSchema>;

// 用户详情响应
export const UserDetailSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  tier: SubscriptionTierSchema,
  creditBalance: z.number(),
  isAdmin: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  profile: z
    .object({
      nickname: z.string().nullable(),
      avatar: z.string().nullable(),
      locale: z.string(),
      timezone: z.string(),
    })
    .nullable(),
  _count: z.object({
    sessions: z.number(),
    subscriptions: z.number(),
    orders: z.number(),
    credits: z.number(),
  }),
});
export type UserDetail = z.infer<typeof UserDetailSchema>;

// 用户列表项
export const UserListItemSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  tier: SubscriptionTierSchema,
  creditBalance: z.number(),
  isAdmin: z.boolean(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
});
export type UserListItem = z.infer<typeof UserListItemSchema>;

// 分页响应
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
