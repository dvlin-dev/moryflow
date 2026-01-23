/**
 * Settings 类型定义
 */

export interface UserQuota {
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  dailyResetsAt: string;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  purchasedQuota: number;
  periodStartsAt?: string;
  periodEndAt: string;
  totalRemaining?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  isAdmin: boolean;
  quota: UserQuota | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
