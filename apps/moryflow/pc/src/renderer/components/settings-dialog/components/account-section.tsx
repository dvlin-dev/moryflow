import { useAuth } from '@/lib/server';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import { LoginPanel } from './account/login-panel';
import { UserProfile } from './account/user-profile';

/**
 * 账户设置 Section
 * 根据登录状态显示登录面板或用户信息
 */
export const AccountSection = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // 未登录场景不展示全局 skeleton，避免登录失败时整块闪烁 loading
  if (isLoading && (isAuthenticated || !!user)) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPanel />;
  }

  return <UserProfile user={user} />;
};
