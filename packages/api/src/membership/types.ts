/**
 * [DEFINES]: Membership 类型与 DTO
 * [USED_BY]: Moryflow PC/Mobile
 * [POS]: 会员模块共享类型定义
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

// ── 会员等级 ──────────────────────────────────────────────

/** 用户会员等级 */
export type UserTier = 'free' | 'starter' | 'basic' | 'pro';

/** 会员等级详情 */
export interface TierInfo {
  displayName: string;
  features: string[];
  creditsPerMonth: number;
}

// ── 积分 ──────────────────────────────────────────────────

/** 积分余额 */
export interface CreditsBalance {
  daily: number;
  subscription: number;
  purchased: number;
  total: number;
  debt: number;
  available: number;
}

/** 订阅详情 */
export interface SubscriptionDetails {
  creditsTotal: number;
  creditsRemaining: number;
  periodEnd: string;
}

/** 积分完整信息 */
export interface CreditsInfo {
  balance: CreditsBalance;
  subscriptionDetails: SubscriptionDetails | null;
}

// ── 用户 ──────────────────────────────────────────────────

/** 用户基础信息 */
export interface MembershipUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  image?: string;
  createdAt: string;
  subscriptionTier: UserTier;
}

/** 用户完整信息（含会员详情） */
export interface MembershipUserInfo extends MembershipUser {
  tierInfo: TierInfo;
  credits: CreditsBalance;
}

/** 用户资料 */
export interface MembershipUserProfile {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

// ── 模型 ──────────────────────────────────────────────────

export interface MembershipThinkingLevelOption {
  id: string;
  label: string;
  description?: string;
  visibleParams?: MembershipThinkingVisibleParam[];
}

export type MembershipThinkingVisibleParamKey = string;

export interface MembershipThinkingVisibleParam {
  key: MembershipThinkingVisibleParamKey;
  value: string;
}

export interface MembershipThinkingProfile {
  supportsThinking: boolean;
  defaultLevel: string;
  levels: MembershipThinkingLevelOption[];
}

/** 会员模型 */
export interface MembershipModel {
  id: string;
  name: string;
  ownedBy: string;
  minTier: string;
  available: boolean;
  contextLength?: number;
  maxOutput?: number;
  thinkingProfile: MembershipThinkingProfile;
}

/** 会员模型 API 响应项 */
export interface MembershipModelApiItem {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  display_name: string;
  min_tier: string;
  available: boolean;
  thinking_profile: MembershipThinkingProfile;
}

/** 会员模型列表 API 响应 */
export interface MembershipModelsResponse {
  object: 'list';
  data: MembershipModelApiItem[];
}

// ── 认证 ──────────────────────────────────────────────────

/** 认证状态 */
export interface MembershipAuthState {
  user: MembershipUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** Better Auth 错误 */
export interface BetterAuthError {
  code?: string;
  message?: string;
}

// ── API 错误 ──────────────────────────────────────────────

/** API 错误响应 */
export interface MembershipApiError {
  message: string;
  code?: string;
  status?: number;
}

// ── 产品和支付 ──────────────────────────────────────────────

/** 产品类型 */
export type ProductType = 'subscription' | 'credits';

/** 产品信息 */
export interface ProductInfo {
  id: string;
  name: string;
  type: ProductType;
  priceUsd: number;
  credits?: number;
  billingCycle?: 'monthly' | 'yearly';
}

/** 产品列表响应 */
export interface ProductsResponse {
  products: ProductInfo[];
}

/** Checkout 配置 */
export interface CheckoutConfig {
  productId: string;
  metadata: {
    referenceId: string;
  };
  successUrl: string;
  cancelUrl: string;
}

/** 订阅信息 */
export interface SubscriptionInfo {
  id: string;
  productId: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

/** 订阅状态响应 */
export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  subscription: SubscriptionInfo | null;
}

/** 创建 Checkout 请求 */
export interface CreateCheckoutRequest {
  productId: string;
  successUrl?: string;
  cancelUrl?: string;
}

/** 创建 Checkout 响应 */
export interface CreateCheckoutResponse {
  checkoutUrl: string;
}
