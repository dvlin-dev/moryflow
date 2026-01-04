/**
 * License DTOs
 * 定义 License 相关的请求和响应数据结构
 *
 * [DEFINES]: License request/response schemas
 * [USED_BY]: LicenseController, LicenseService
 */

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// ==================== Request Schemas ====================

/**
 * 验证 License 请求
 */
export const ValidateLicenseSchema = z.object({
  licenseKey: z.string().min(1, 'licenseKey is required'),
  instanceName: z.string().optional(),
});

export class ValidateLicenseDto extends createZodDto(ValidateLicenseSchema) {}

/**
 * 激活 License 请求
 */
export const ActivateLicenseSchema = z.object({
  licenseKey: z.string().min(1, 'licenseKey is required'),
  instanceName: z.string().min(1, 'instanceName is required'),
});

export class ActivateLicenseDto extends createZodDto(ActivateLicenseSchema) {}

/**
 * 停用 License 请求
 */
export const DeactivateLicenseSchema = z.object({
  licenseKey: z.string().min(1, 'licenseKey is required'),
  instanceId: z.string().min(1, 'instanceId is required'),
});

export class DeactivateLicenseDto extends createZodDto(DeactivateLicenseSchema) {}

// ==================== Response Schemas ====================

/**
 * License 信息响应
 */
export const LicenseInfoSchema = z.object({
  id: z.string(),
  tier: z.string(),
  activationCount: z.number().int(),
  activationLimit: z.number().int(),
});

export type LicenseInfoDto = z.infer<typeof LicenseInfoSchema>;

/**
 * License 验证状态
 */
export const LicenseValidationStatusSchema = z.enum([
  'active',
  'revoked',
  'not_found',
  'limit_exceeded',
]);

export type LicenseValidationStatus = z.infer<
  typeof LicenseValidationStatusSchema
>;

/**
 * License 验证结果
 */
export const LicenseValidationResultSchema = z.object({
  valid: z.boolean(),
  status: LicenseValidationStatusSchema,
  license: LicenseInfoSchema.optional(),
  instanceId: z.string().optional(),
});

export type LicenseValidationResultDto = z.infer<
  typeof LicenseValidationResultSchema
>;

/**
 * License 激活记录
 */
export const LicenseActivationSchema = z.object({
  id: z.string(),
  instanceName: z.string(),
  instanceId: z.string(),
  status: z.string(),
  activatedAt: z.date(),
  deactivatedAt: z.date().nullable().optional(),
});

export type LicenseActivationDto = z.infer<typeof LicenseActivationSchema>;

/**
 * License 完整信息（管理员视图）
 */
export const LicenseDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  licenseKey: z.string(),
  orderId: z.string(),
  tier: z.string(),
  status: z.string(),
  activationCount: z.number().int(),
  activationLimit: z.number().int(),
  createdAt: z.date(),
  activations: z.array(LicenseActivationSchema).optional(),
});

export type LicenseDetailDto = z.infer<typeof LicenseDetailSchema>;
