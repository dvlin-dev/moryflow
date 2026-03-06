/**
 * [PROVIDES]: fetchCurrentUser/fetchCredits/fetchProfile/updateProfile/fetchMembershipModels/fetchProducts/createCheckout/deleteAccount
 * [DEPENDS]: @moryflow/api client + paths, auth-session
 * [POS]: PC Renderer 业务 API 函数层（Promise 风格）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import {
  createApiClient,
  ServerApiError,
  USER_API,
  OPENAI_API,
  PAYMENT_API,
  getTierInfo,
} from '@moryflow/api';
import { MEMBERSHIP_API_URL } from './const';
import { getAccessToken, refreshAccessToken } from './auth-session';
import type {
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  CreditsInfo,
  DeleteAccountRequest,
  ModelsResponse,
  ProductsResponse,
  UserInfo,
  UserProfile,
} from './types';

const apiClient = createApiClient({
  baseUrl: MEMBERSHIP_API_URL,
  defaultAuthMode: 'bearer',
  getAccessToken,
  onUnauthorized: refreshAccessToken,
});

export { ServerApiError };

export async function fetchCurrentUser(): Promise<UserInfo> {
  const user = await apiClient.get<Omit<UserInfo, 'tierInfo'>>(USER_API.ME);
  return { ...user, tierInfo: getTierInfo(user.subscriptionTier) };
}

export async function fetchCredits(): Promise<CreditsInfo> {
  return apiClient.get<CreditsInfo>(USER_API.CREDITS);
}

export async function fetchProfile(): Promise<UserProfile> {
  return apiClient.get<UserProfile>(USER_API.PROFILE);
}

export async function updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
  return apiClient.patch<UserProfile>(USER_API.PROFILE, { body: data });
}

export async function fetchMembershipModels(): Promise<ModelsResponse> {
  return apiClient.get<ModelsResponse>(OPENAI_API.MODELS);
}

export async function fetchProducts(): Promise<ProductsResponse> {
  return apiClient.get<ProductsResponse>(PAYMENT_API.PRODUCTS, { authMode: 'public' });
}

export async function createCheckout(data: CreateCheckoutRequest): Promise<CreateCheckoutResponse> {
  return apiClient.post<CreateCheckoutResponse>(PAYMENT_API.CHECKOUT, { body: data });
}

export async function deleteAccount(data: DeleteAccountRequest): Promise<void> {
  return apiClient.del<void>(USER_API.DELETE_ACCOUNT, { body: data });
}
