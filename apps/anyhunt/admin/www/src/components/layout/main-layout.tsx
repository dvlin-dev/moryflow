/**
 * [PROPS]: 无
 * [EMITS]: logout (click)
 * [POS]: Admin 主布局壳（sidebar/header/content 装配）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ADMIN_NAV_GROUPS, isPathActive } from '@/app/admin-routes';
import { useAuthStore } from '@/stores/auth';
import { authMethods } from '@/lib/auth/auth-methods';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

type OpenGroups = Record<string, boolean>;

function buildOpenGroupsByPath(pathname: string): OpenGroups {
  const initial: OpenGroups = {};

  for (const group of ADMIN_NAV_GROUPS) {
    initial[group.id] = group.items.some((item) => isPathActive(pathname, item.path));
  }

  return initial;
}

function expandOpenGroupsByPath(prev: OpenGroups, pathname: string): OpenGroups {
  let changed = false;
  const next = { ...prev };

  for (const group of ADMIN_NAV_GROUPS) {
    if (!group.items.some((item) => isPathActive(pathname, item.path))) {
      continue;
    }

    if (next[group.id]) {
      continue;
    }

    next[group.id] = true;
    changed = true;
  }

  return changed ? next : prev;
}

export function MainLayout() {
  const location = useLocation();
  const userEmail = useAuthStore((state) => state.user?.email ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<OpenGroups>(() =>
    buildOpenGroupsByPath(location.pathname)
  );

  useEffect(() => {
    setOpenGroups((prev) => expandOpenGroupsByPath(prev, location.pathname));
  }, [location.pathname]);

  const handleLogout = async () => {
    await authMethods.logout();
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeSidebar} />
      ) : null}

      <AdminSidebar
        pathname={location.pathname}
        sidebarOpen={sidebarOpen}
        openGroups={openGroups}
        onOpenGroupChange={(groupId, next) => {
          setOpenGroups((prev) => {
            if (prev[groupId] === next) {
              return prev;
            }
            return {
              ...prev,
              [groupId]: next,
            };
          });
        }}
        onCloseSidebar={closeSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          userEmail={userEmail}
          onOpenSidebar={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />

        <main className="min-w-0 flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
