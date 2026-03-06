/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Admin 路由装配层（bootstrap + guard + route fallback）
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { authMethods } from '@/lib/auth/auth-methods';
import { useAuthStore } from '@/stores/auth';
import { ADMIN_PROTECTED_ROUTES } from './admin-routes';
import { AuthGuard } from './AuthGuard';

const LoginPage = lazy(() => import('@/pages/LoginPage'));

function RoutePendingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  );
}

function AuthBootstrapper() {
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  useEffect(() => {
    if (!isBootstrapped) {
      void authMethods.bootstrapAuth();
    }
  }, [isBootstrapped]);

  return null;
}

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-destructive">403 Unauthorized</h1>
        <p className="mt-2 text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">The route does not exist or has been moved.</p>
      </div>
    </div>
  );
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        {ADMIN_PROTECTED_ROUTES.map((route) => {
          const RouteComponent = route.component;

          if (route.index) {
            return <Route key={route.id} index element={<RouteComponent />} />;
          }

          if (!route.path) {
            return null;
          }

          return <Route key={route.id} path={route.path} element={<RouteComponent />} />;
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthBootstrapper />
      <Suspense fallback={<RoutePendingState />}>
        <AdminRoutes />
      </Suspense>
    </BrowserRouter>
  );
}
