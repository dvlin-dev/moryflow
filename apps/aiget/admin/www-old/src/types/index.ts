/**
 * [DEFINES]: 类型定义
 * [USED_BY]: 整个前端应用
 * [POS]: 统一管理后台类型定义
 */

// 订阅等级
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'MAX';

// 订阅状态
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'EXPIRED' | 'PAST_DUE';

// 订单状态
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

// 订单类型
export type OrderType = 'SUBSCRIPTION' | 'CREDIT_BOOST';

// 积分类型
export type CreditType = 'SUBSCRIPTION' | 'PURCHASED' | 'BONUS' | 'CONSUMPTION';

// 管理日志级别
export type AdminLogLevel = 'INFO' | 'WARN' | 'ERROR';

// 用户
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
  tier: SubscriptionTier;
  creditBalance: number;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// 订阅
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: string;
  providerSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// 订单
export interface Order {
  id: string;
  userId: string;
  subscriptionId: string | null;
  type: OrderType;
  status: OrderStatus;
  amount: number;
  currency: string;
  provider: string;
  providerOrderId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// 积分流水
export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditType;
  amount: number;
  balance: number;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user?: User;
}

// 管理日志
export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string | null;
  targetUserEmail: string | null;
  action: string;
  level: AdminLogLevel;
  details: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 统计数据
export interface Stats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  tierDistribution: Record<SubscriptionTier, number>;
  totalRevenue: number;
  totalCreditsGranted: number;
  totalCreditsConsumed: number;
}

// 当前管理员
export interface CurrentAdmin {
  id: string;
  email: string;
  name: string | null;
  image?: string | null;
  isAdmin: boolean;
}
