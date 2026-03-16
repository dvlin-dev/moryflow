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

export interface RedemptionCodeQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'CREDITS' | 'MEMBERSHIP';
  isActive?: string;
}
