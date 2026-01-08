/**
 * 支付相关类型定义
 */

// 订阅状态
export type SubscriptionStatus = 'active' | 'canceled' | 'unpaid' | 'scheduled_cancel' | 'trialing';

// 订单状态
export type OrderStatus = 'pending' | 'completed' | 'refunded' | 'failed';

// 产品类型
export type ProductType = 'subscription' | 'credits' | 'license';

// License 状态
export type LicenseStatus = 'active' | 'revoked';

// License 层级
export type LicenseTier = 'standard' | 'pro';

/**
 * 订阅记录
 */
export interface Subscription {
  id: string;
  userId: string;
  creemSubscriptionId: string;
  creemCustomerId: string;
  productId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 支付订单
 */
export interface PaymentOrder {
  id: string;
  userId: string;
  creemCheckoutId: string;
  creemOrderId: string | null;
  productId: string;
  productType: ProductType;
  amount: number; // 金额（美分）
  currency: string;
  status: OrderStatus;
  discountCode: string | null;
  metadata: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * License 记录
 */
export interface License {
  id: string;
  userId: string;
  licenseKey: string;
  orderId: string;
  tier: LicenseTier;
  status: LicenseStatus;
  activationCount: number;
  activationLimit: number;
  createdAt: string;
}

/**
 * License 激活记录
 */
export interface LicenseActivation {
  id: string;
  licenseId: string;
  instanceName: string;
  instanceId: string;
  status: 'active' | 'deactivated';
  activatedAt: string;
  deactivatedAt: string | null;
}

/**
 * 分页信息
 */
export interface Pagination {
  limit: number;
  offset: number;
  count: number;
}

/**
 * 列表响应基础接口
 */
export interface ListResponse {
  pagination: Pagination;
}

export interface SubscriptionListResponse {
  subscriptions: Subscription[];
  pagination: Pagination;
}

export interface OrderListResponse {
  orders: PaymentOrder[];
  pagination: Pagination;
}

export interface LicenseListResponse {
  licenses: License[];
  pagination: Pagination;
}
