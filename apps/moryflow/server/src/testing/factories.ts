/**
 * Test Factories
 * 用于创建测试数据的工厂函数
 * 所有字段与 Prisma Schema 完全对应
 */

import { randomUUID } from 'crypto';
// Prisma 7: 从 client 导入模型类型，从 enums 导入枚举值类型
import type {
  User,
  Session,
  License,
  LicenseActivation,
  Subscription,
  SubscriptionCredits,
  PurchasedCredits,
  CreditDebt,
  AiModel,
  AiProvider,
  ActivityLog,
  PaymentOrder,
} from '../../generated/prisma/client';
import {
  SubscriptionTier,
  LicenseStatus,
  LicenseTier,
  LicenseActivationStatus,
  SubscriptionStatus,
  PaymentStatus,
  ProductType,
} from '../../generated/prisma/enums';

/**
 * 用户测试数据工厂
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: true,
    image: null,
    isAdmin: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Session 测试数据工厂
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  const now = new Date();
  return {
    id: randomUUID(),
    userId: randomUUID(),
    token: `session_${randomUUID()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * License 测试数据工厂
 */
export function createMockLicense(overrides: Partial<License> = {}): License {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    licenseKey: `LIC-${randomUUID().slice(0, 8).toUpperCase()}`,
    orderId: `order_${randomUUID().slice(0, 8)}`,
    tier: LicenseTier.standard,
    status: LicenseStatus.active,
    activationCount: 0,
    activationLimit: 2,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * License Activation 测试数据工厂
 */
export function createMockLicenseActivation(
  overrides: Partial<LicenseActivation> = {},
): LicenseActivation {
  return {
    id: randomUUID(),
    licenseId: randomUUID(),
    instanceId: randomUUID(),
    instanceName: 'Test Device',
    status: LicenseActivationStatus.active,
    activatedAt: new Date(),
    deactivatedAt: null,
    ...overrides,
  };
}

/**
 * Subscription 测试数据工厂
 */
export function createMockSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  const now = new Date();
  return {
    id: randomUUID(),
    userId: randomUUID(),
    tier: SubscriptionTier.free,
    creemSubscriptionId: `sub_${randomUUID().slice(0, 8)}`,
    creemCustomerId: `cust_${randomUUID().slice(0, 8)}`,
    productId: 'prod_basic_monthly',
    status: SubscriptionStatus.active,
    currentPeriodStart: now,
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Subscription Credits 测试数据工厂
 */
export function createMockSubscriptionCredits(
  overrides: Partial<SubscriptionCredits> = {},
): SubscriptionCredits {
  const now = new Date();
  return {
    userId: randomUUID(),
    creditsTotal: 1000,
    creditsRemaining: 1000,
    periodStart: now,
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Purchased Credits 测试数据工厂
 */
export function createMockPurchasedCredits(
  overrides: Partial<PurchasedCredits> = {},
): PurchasedCredits {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    amount: 500,
    remaining: 500,
    orderId: `order_${randomUUID().slice(0, 8)}`,
    purchasedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

/**
 * Credit Debt 测试数据工厂
 */
export function createMockCreditDebt(
  overrides: Partial<CreditDebt> = {},
): CreditDebt {
  const now = new Date();
  return {
    userId: randomUUID(),
    amount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * AI Model 测试数据工厂
 */
export function createMockAiModel(overrides: Partial<AiModel> = {}): AiModel {
  const now = new Date();
  return {
    id: randomUUID(),
    providerId: randomUUID(),
    modelId: 'gpt-4o-mini',
    upstreamId: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    enabled: true,
    inputTokenPrice: 0.15,
    outputTokenPrice: 0.6,
    minTier: SubscriptionTier.free,
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    capabilitiesJson: {},
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * AI Provider 测试数据工厂
 */
export function createMockAiProvider(
  overrides: Partial<AiProvider> = {},
): AiProvider {
  const now = new Date();
  return {
    id: randomUUID(),
    providerType: 'openai',
    name: 'OpenAI',
    apiKey: 'test-api-key',
    baseUrl: null,
    enabled: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Activity Log 测试数据工厂
 */
export function createMockActivityLog(
  overrides: Partial<ActivityLog> = {},
): ActivityLog {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    targetUserId: null,
    category: 'admin',
    action: 'set_tier',
    level: 'info',
    details: {},
    ip: null,
    userAgent: null,
    duration: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Payment Order 测试数据工厂
 */
export function createMockPaymentOrder(
  overrides: Partial<PaymentOrder> = {},
): PaymentOrder {
  const now = new Date();
  return {
    id: randomUUID(),
    userId: randomUUID(),
    creemCheckoutId: `checkout_${randomUUID().slice(0, 8)}`,
    creemOrderId: `order_${randomUUID().slice(0, 8)}`,
    productId: 'credits_500',
    productType: ProductType.credits,
    amount: 1000,
    currency: 'USD',
    status: PaymentStatus.completed,
    discountCode: null,
    metadata: null,
    createdAt: now,
    completedAt: now,
    ...overrides,
  };
}

/**
 * CurrentUser DTO 测试数据工厂
 */
export function createMockCurrentUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
    tier: SubscriptionTier;
    isAdmin: boolean;
  }> = {},
) {
  return {
    id: randomUUID(),
    email: 'test@example.com',
    name: 'Test User',
    tier: SubscriptionTier.free,
    isAdmin: false,
    ...overrides,
  };
}

// Re-export enums for convenience
export {
  SubscriptionTier,
  LicenseStatus,
  LicenseTier,
  LicenseActivationStatus,
  SubscriptionStatus,
  PaymentStatus,
  ProductType,
};
