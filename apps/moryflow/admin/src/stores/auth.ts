/**
 * 认证状态管理
 * access token 仅存内存，refresh 由 HttpOnly Cookie 管理
 */
import { create } from 'zustand';
import { API_BASE_URL } from '@/lib/api-base';

/** 用户信息 */
interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  isAdmin: boolean;
}

/** 认证状态 */
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  ensureAccessToken: () => Promise<string | null>;
}

type AuthResponse = {
  accessToken?: string;
};

type AdminMeResponse = {
  user?: AuthUser;
};

let refreshPromise: Promise<boolean> | null = null;

const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Request failed';
    throw new Error(message);
  }
  return data as T;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: false,

  bootstrap: async () => {
    set({ isBootstrapping: true });
    try {
      const refreshed = await get().refreshAccessToken();
      if (!refreshed) {
        set({ user: null, accessToken: null, isAuthenticated: false });
        return;
      }

      const token = get().accessToken;
      if (!token) {
        set({ user: null, accessToken: null, isAuthenticated: false });
        return;
      }

      const data = await fetchJson<AdminMeResponse>(`${API_BASE_URL}/api/admin/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data.user) {
        throw new Error('Admin session not found');
      }

      set({ user: data.user, isAuthenticated: true });
    } catch {
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isBootstrapping: false });
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

    const data = await fetchJson<AdminMeResponse>(`${API_BASE_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!data.user) {
      throw new Error('Admin session not found');
    }

    set({ user: data.user, isAuthenticated: true });
  },

  logout: async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => undefined);

    set({ user: null, accessToken: null, isAuthenticated: false });
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
    if (token) {
      return token;
    }
    const refreshed = await get().refreshAccessToken();
    return refreshed ? get().accessToken : null;
  },
}));

/** 获取当前 access token */
export const getAccessToken = () => useAuthStore.getState().accessToken;
