export interface RedemptionCode {
  id: string;
  code: string;
  type: 'CREDITS' | 'MEMBERSHIP';
  creditsAmount: number | null;
  membershipTier: string | null;
  membershipDays: number | null;
  maxRedemptions: number;
  currentRedemptions: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { usages: number };
}

export interface RedemptionCodeUsage {
  id: string;
  userId: string;
  redeemedAt: string;
  type: 'CREDITS' | 'MEMBERSHIP';
  creditsAmount: number | null;
  membershipTier: string | null;
  membershipDays: number | null;
}

export interface RedemptionCodeDetail extends RedemptionCode {
  usages: RedemptionCodeUsage[];
}

export interface RedemptionCodeConfig {
  tiers: { value: string; label: string }[];
}

export interface RedemptionCodesListResponse {
  items: RedemptionCode[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateRedemptionCodeRequest {
  type: 'CREDITS' | 'MEMBERSHIP';
  creditsAmount?: number;
  membershipTier?: string;
  membershipDays?: number;
  maxRedemptions?: number;
  code?: string;
  expiresAt?: string;
  note?: string;
}

export interface UpdateRedemptionCodeRequest {
  maxRedemptions?: number;
  expiresAt?: string | null;
  isActive?: boolean;
  note?: string;
}
