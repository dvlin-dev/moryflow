/**
 * Memory Admin - 管理后台入口
 * 路由配置和全局 Provider
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import OrdersPage from './pages/OrdersPage';

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
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

function App() {
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
        <p className="mt-2 text-muted-foreground">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
}

export default App;
