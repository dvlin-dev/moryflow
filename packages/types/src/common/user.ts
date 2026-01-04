/**
 * [DEFINES]: 统一用户类型、API Key 类型
 * [USED_BY]: 所有产品的服务端和客户端
 * [POS]: 统一身份平台核心类型
 */

// ============ 用户角色 ============

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ============ 用户信息 ============

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ API Key ============

export const ApiKeyPrefix = {
  PLATFORM: 'ag_', // Aiget 平台通用
  FLOWX: 'lx_', // Flowx
  FETCHX: 'fx_', // Fetchx
  MEMOX: 'mx_', // Memox
  SANDX: 'sx_', // Sandx
} as const;

export type ApiKeyPrefix = (typeof ApiKeyPrefix)[keyof typeof ApiKeyPrefix];

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string; // 显示用（如 "ag_xxxx..."）
  keyHash: string; // SHA256 哈希，用于验证
  productScope: string[]; // 可访问的产品列表
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  productScope?: string[]; // 默认 ['*']（所有产品）
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string; // 完整 key，仅创建时返回一次
  keyPrefix: string;
  productScope: string[];
}
