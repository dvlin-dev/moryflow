/**
 * [PROVIDES]: AuthProvider, useAuth
 * [DEPENDS]: auth-client, react
 * [POS]: 全局认证状态 Context，提供用户信息和认证操作
 */
import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useSession, authClient, type User } from './auth-client';

interface AuthContextValue {
  /** 当前用户（未登录时为 null） */
  user: User | null;
  /** 是否正在加载会话 */
  isLoading: boolean;
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 登出 */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 认证 Provider
 *
 * 在应用根组件中包裹，提供全局认证状态：
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { data: session, isPending } = useSession();

  const signOut = useCallback(async () => {
    await authClient.signOut();
    // 登出后跳转到首页
    window.location.href = '/';
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: Boolean(session?.user),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * 获取认证状态的 Hook
 *
 * @example
 * function Header() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <Link to="/login">Login</Link>;
 *   }
 *
 *   return (
 *     <div>
 *       <span>{user.email}</span>
 *       <button onClick={signOut}>Logout</button>
 *     </div>
 *   );
 * }
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
