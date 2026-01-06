/**
 * Vault DTOs
 * 使用 Zod 进行运行时验证
 *
 * [DEFINES]: Vault request/response schemas
 * [USED_BY]: VaultController, VaultService
 */

import { z } from 'zod';

// ==================== Request Schemas ====================

/**
 * 创建 Vault 请求
 */
export const CreateVaultSchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
});

export type CreateVaultDto = z.infer<typeof CreateVaultSchema>;

/**
 * 更新 Vault 请求
 */
export const UpdateVaultSchema = z.object({
  name: z
    .string()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters'),
});

export type UpdateVaultDto = z.infer<typeof UpdateVaultSchema>;

/**
 * 注册设备请求
 */
export const RegisterDeviceSchema = z.object({
  deviceId: z.string().uuid('deviceId must be a valid UUID'),
  deviceName: z
    .string()
    .min(1, 'deviceName is required')
    .max(100, 'deviceName must be at most 100 characters'),
});

export type RegisterDeviceDto = z.infer<typeof RegisterDeviceSchema>;

// ==================== Response Schemas ====================

/**
 * Vault 响应
 */
export const VaultSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  fileCount: z.number().int().optional(),
  deviceCount: z.number().int().optional(),
});

export type VaultDto = z.infer<typeof VaultSchema>;

/**
 * Vault 设备响应
 */
export const VaultDeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  deviceName: z.string(),
  lastSyncAt: z.date().nullable(),
});

export type VaultDeviceDto = z.infer<typeof VaultDeviceSchema>;

/**
 * Vault 列表响应
 */
export const VaultListSchema = z.object({
  vaults: z.array(VaultSchema),
});

export type VaultListDto = z.infer<typeof VaultListSchema>;
