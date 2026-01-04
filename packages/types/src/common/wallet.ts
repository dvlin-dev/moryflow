/**
 * [DEFINES]: 统一钱包类型、积分包类型、积分交易类型
 * [USED_BY]: 所有产品的服务端和客户端
 * [POS]: 统一身份平台核心类型
 */

// ============ 积分来源 ============

export const CreditSource = {
  FREE: 'FREE', // 免费赠送
  SUBSCRIPTION: 'SUBSCRIPTION', // 订阅赠送
  PURCHASED: 'PURCHASED', // 购买
} as const;

export type CreditSource = (typeof CreditSource)[keyof typeof CreditSource];

// ============ 积分包配置 ============

export interface CreditPackConfig {
  name: string;
  credits: number;
  price: number; // 美分
}

export const CREDIT_PACK_CONFIGS: CreditPackConfig[] = [
  { name: 'Small', credits: 1000, price: 1000 },
  { name: 'Medium', credits: 3000, price: 3000 },
  { name: 'Large', credits: 10000, price: 10000 },
];

// ============ 钱包余额 ============

export interface WalletBalance {
  userId: string;
  freeCredits: number; // 免费积分
  subscriptionCredits: number; // 订阅积分
  purchasedCredits: number; // 购买积分
  totalCredits: number; // 总计
}

// ============ 积分交易 ============

export const TransactionType = {
  CREDIT: 'CREDIT', // 增加
  DEBIT: 'DEBIT', // 扣除
  REFUND: 'REFUND', // 退款
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export interface CreditTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  source: CreditSource;
  productId: string; // flowx, fetchx, memox, sandx
  operationId?: string; // 关联的操作 ID
  description: string;
  createdAt: string;
}

// ============ 积分状态 ============

export interface CreditStatus {
  balance: WalletBalance;
  subscriptionCreditsResetAt: string; // 订阅积分重置时间
}
