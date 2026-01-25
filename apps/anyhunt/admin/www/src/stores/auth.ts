/**
 * [PROVIDES]: useAuthStore, getAuthUser, getAccessToken
 * [DEPENDS]: zustand, fetch
 * [POS]: Admin 端认证状态管理（access token 内存 + refresh cookie）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { create } from 'zustand';
import { API_BASE_URL } from '@/lib/api-base';
import { USER_API } from '@/lib/api-paths';
import type { ProblemDetails } from '@anyhunt/types';

/** Admin 用户信息（来自 /api/v1/user/me） */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  isAdmin: boolean;
}

/** 认证状态 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  ensureAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

type AuthResponse = {
  accessToken?: string;
};

let refreshPromise: Promise<boolean> | null = null;

const getProblemMessage = (payload: unknown, fallback: string): string => {
  const problem = payload as ProblemDetails;
  return typeof problem?.detail === 'string' ? problem.detail : fallback;
};

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = getProblemMessage(data, 'Request failed');
    throw new Error(message);
  }
  return data as T;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapped: false,

  bootstrap: async () => {
    if (get().isBootstrapped) return;

    try {
      const refreshed = await get().refreshAccessToken();
      if (!refreshed) {
        set({ user: null, accessToken: null, isAuthenticated: false, isBootstrapped: true });
        return;
      }

      const token = get().accessToken;
      if (!token) {
        set({ user: null, accessToken: null, isAuthenticated: false, isBootstrapped: true });
        return;
      }

      const user = await fetchJson<AuthUser>(`${API_BASE_URL}${USER_API.ME}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      set({ user, isAuthenticated: true, isBootstrapped: true });
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false, isBootstrapped: true });
    }
  },

  signIn: async (email: string, password: string) => {
    await fetchJson(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const refreshed = await get().refreshAccessToken();
    if (!refreshed) {
      throw new Error('Unable to establish session');
    }

    const token = get().accessToken;
    if (!token) {
      throw new Error('Access token missing');
    }

    const user = await fetchJson<AuthUser>(`${API_BASE_URL}${USER_API.ME}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!user.isAdmin) {
      await get().logout();
      throw new Error('Admin access required');
    }

    set({ user, isAuthenticated: true, isBootstrapped: true });
  },

  refreshAccessToken: async () => {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const data = await fetchJson<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!data.accessToken) {
            set({ accessToken: null });
            return false;
          }

          set({ accessToken: data.accessToken });
          return true;
        } catch {
          set({ accessToken: null });
          return false;
        }
      })().finally(() => {
        refreshPromise = null;
      });
    }

    return refreshPromise;
  },

  ensureAccessToken: async () => {
    const token = get().accessToken;
    if (token) return token;
    const refreshed = await get().refreshAccessToken();
    return refreshed ? get().accessToken : null;
  },

  logout: async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);

    set({ user: null, accessToken: null, isAuthenticated: false, isBootstrapped: true });
  },
}));

/** 获取当前用户 */
export const getAuthUser = () => useAuthStore.getState().user;

/** 获取当前 access token */
export const getAccessToken = () => useAuthStore.getState().accessToken;
