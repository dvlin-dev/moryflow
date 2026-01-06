/**
 * 头部组件
 */
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export function Header() {
  const { admin, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch {
      // 忽略错误
    }
    logout();
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-4">
        {admin && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{admin.email}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </header>
  );
}
