/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Admin 应用入口与路由保护
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { authClient } from './lib/auth-client';
import { toAuthUser } from './lib/auth-utils';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import OrdersPage from './pages/OrdersPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import QueuesPage from './pages/QueuesPage';
import ErrorsPage from './pages/ErrorsPage';
import BrowserPage from './pages/BrowserPage';

// React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 分钟
      retry: 1,
    },
  },
});

/** 受保护路由（需要登录 + isAdmin） */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isBootstrapped } = useAuthStore();

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setBootstrapped = useAuthStore((state) => state.setBootstrapped);

  useEffect(() => {
    let isActive = true;

    if (isBootstrapped || isAuthenticated) {
      if (!isBootstrapped && isAuthenticated) {
        setBootstrapped(true);
      }
      return;
    }

    const bootstrap = async () => {
      try {
        const refresh = await authClient.refresh();
        const me = await authClient.me(refresh.accessToken);
        if (!isActive) return;
        setSession(toAuthUser(me), refresh.accessToken);
      } catch {
        if (!isActive) return;
        clearSession();
      } finally {
        if (isActive) {
          setBootstrapped(true);
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
  }, [isAuthenticated, isBootstrapped, setBootstrapped, setSession, clearSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - 系统统计 */}
            <Route index element={<DashboardPage />} />

            {/* Users - 用户管理 */}
            <Route path="users" element={<UsersPage />} />

            {/* Orders - 订单管理 */}
            <Route path="orders" element={<OrdersPage />} />

            {/* Subscriptions - 订阅管理 */}
            <Route path="subscriptions" element={<SubscriptionsPage />} />

            {/* Jobs - 任务管理 */}
            <Route path="jobs" element={<JobsPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />

            {/* Queues - 队列监控 */}
            <Route path="queues" element={<QueuesPage />} />

            {/* Errors - 错误分析 */}
            <Route path="errors" element={<ErrorsPage />} />

            {/* Browser - 浏览器池监控 */}
            <Route path="browser" element={<BrowserPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

/** 无权限页面 */
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

export default App;
