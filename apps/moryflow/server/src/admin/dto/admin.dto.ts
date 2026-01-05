/**
 * Admin DTOs
 * 管理员相关的请求和响应数据结构
 *
 * [DEFINES]: Admin request schemas (user tier, credits, permissions)
 * [USED_BY]: AdminController, AdminService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Constants ====================

/** 分页限制常量 */
export const PAGINATION_MAX_LIMIT = 100;
export const PAGINATION_DEFAULT_LIMIT = 50;

// ==================== Request DTOs ====================

/**
 * 设置用户等级请求
 */
export const SetUserTierSchema = z.object({
  tier: z.enum(['free', 'basic', 'pro', 'license']),
});

export class SetUserTierDto extends createZodDto(SetUserTierSchema) {}

/**
 * 发放积分请求
 */
export const GrantCreditsSchema = z.object({
  type: z.enum(['subscription', 'purchased']),
  amount: z.number().positive(),
});

export class GrantCreditsDto extends createZodDto(GrantCreditsSchema) {}

/**
 * 设置管理员权限请求
 */
export const SetAdminPermissionSchema = z.object({
  isAdmin: z.boolean(),
});

export class SetAdminPermissionDto extends createZodDto(
  SetAdminPermissionSchema,
) {}

/**
 * 分页查询参数 - M7 Fix: 添加上限保护
 */
export const PaginationSchema = z.object({
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

export class PaginationDto extends createZodDto(PaginationSchema) {}

/**
 * 管理员登录请求
 */
export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export class AdminLoginDto extends createZodDto(AdminLoginSchema) {}

/**
 * 发送邮件请求
 */
export const SendEmailSchema = z.object({
  to: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Email subject is required'),
  html: z.string().min(1, 'Email content is required'),
});

export class SendEmailDto extends createZodDto(SendEmailSchema) {}
