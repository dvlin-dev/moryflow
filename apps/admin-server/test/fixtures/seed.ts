/**
 * 测试数据种子
 * 提供统一的测试数据
 */

import type {
  SubscriptionTier,
  OrderStatus,
  OrderType,
  CreditType,
  AdminLogLevel,
} from '@aiget/identity-db';

// 测试用户数据
export const testUsers = {
  admin: {
    id: 'admin-user-id-001',
    email: 'admin@example.com',
    name: 'Admin User',
    emailVerified: true,
    isAdmin: true,
    tier: 'PRO' as SubscriptionTier,
    creditBalance: 5100,
    monthlyCredits: 5000,
    bonusCredits: 100,
    purchasedCredits: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  },
  normalUser: {
    id: 'normal-user-id-001',
    email: 'user@example.com',
    name: 'Normal User',
    emailVerified: true,
    isAdmin: false,
    tier: 'FREE' as SubscriptionTier,
    creditBalance: 100,
    monthlyCredits: 100,
    bonusCredits: 0,
    purchasedCredits: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    deletedAt: null,
  },
  proUser: {
    id: 'pro-user-id-001',
    email: 'pro@example.com',
    name: 'Pro User',
    emailVerified: true,
    isAdmin: false,
    tier: 'PRO' as SubscriptionTier,
    creditBalance: 6500,
    monthlyCredits: 5000,
    bonusCredits: 500,
    purchasedCredits: 1000,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    deletedAt: null,
  },
};

// 测试订阅数据
export const testSubscriptions = {
  proSubscription: {
    id: 'sub-001',
    userId: testUsers.proUser.id,
    tier: 'PRO' as SubscriptionTier,
    status: 'ACTIVE' as const,
    currentPeriodStart: new Date('2024-01-01'),
    currentPeriodEnd: new Date('2024-02-01'),
    cancelAtPeriodEnd: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: testUsers.proUser,
  },
};

// 测试订单数据
export const testOrders = {
  successOrder: {
    id: 'order-001',
    userId: testUsers.proUser.id,
    type: 'SUBSCRIPTION' as OrderType,
    status: 'PAID' as OrderStatus,
    amount: 2900,
    currency: 'USD',
    provider: 'stripe',
    providerOrderId: 'stripe_order_001',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    user: testUsers.proUser,
  },
  pendingOrder: {
    id: 'order-002',
    userId: testUsers.normalUser.id,
    type: 'CREDIT_BOOST' as OrderType,
    status: 'PENDING' as OrderStatus,
    amount: 1000,
    currency: 'USD',
    provider: 'stripe',
    providerOrderId: 'stripe_order_002',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    user: testUsers.normalUser,
  },
};

// 测试积分流水数据
export const testCreditTransactions = {
  subscription: {
    id: 'credit-001',
    userId: testUsers.proUser.id,
    type: 'SUBSCRIPTION' as CreditType,
    amount: 5000,
    balance: 5000,
    reason: 'Monthly subscription credits',
    createdAt: new Date('2024-01-01'),
    user: testUsers.proUser,
  },
  consumption: {
    id: 'credit-002',
    userId: testUsers.proUser.id,
    type: 'CONSUMPTION' as CreditType,
    amount: -50,
    balance: 4950,
    reason: 'API usage',
    createdAt: new Date('2024-01-02'),
    user: testUsers.proUser,
  },
  bonus: {
    id: 'credit-003',
    userId: testUsers.normalUser.id,
    type: 'BONUS' as CreditType,
    amount: 100,
    balance: 200,
    reason: 'Welcome bonus',
    createdAt: new Date('2024-01-15'),
    user: testUsers.normalUser,
  },
};

// 测试管理日志数据
export const testAdminLogs = {
  tierChange: {
    id: 'log-001',
    adminId: testUsers.admin.id,
    adminEmail: testUsers.admin.email,
    action: 'SET_TIER',
    level: 'INFO' as AdminLogLevel,
    targetUserId: testUsers.normalUser.id,
    targetUserEmail: testUsers.normalUser.email,
    details: { oldTier: 'FREE', newTier: 'PRO' },
    ip: '127.0.0.1',
    createdAt: new Date('2024-01-20'),
  },
  creditGrant: {
    id: 'log-002',
    adminId: testUsers.admin.id,
    adminEmail: testUsers.admin.email,
    action: 'GRANT_CREDITS',
    level: 'INFO' as AdminLogLevel,
    targetUserId: testUsers.normalUser.id,
    targetUserEmail: testUsers.normalUser.email,
    details: { amount: 500, reason: 'Compensation' },
    ip: '127.0.0.1',
    createdAt: new Date('2024-01-21'),
  },
};

// 分页数据
export const paginatedResponse = <T>(items: T[], total: number, page = 1, limit = 20) => ({
  items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
