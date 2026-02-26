/**
 * [PROPS]: userEmail / onOpenSidebar / onLogout
 * [EMITS]: openSidebar / logout
 * [POS]: Admin 顶部栏
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { LogOut, Menu } from 'lucide-react';

export interface AdminHeaderProps {
  userEmail: string | null;
  onOpenSidebar: () => void;
  onLogout: () => Promise<void>;
}

export function AdminHeader({ userEmail, onOpenSidebar, onLogout }: AdminHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onOpenSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold">Admin Panel</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => {
            void onLogout();
          }}
          className="flex items-center gap-1.5 text-sm text-destructive hover:underline"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
