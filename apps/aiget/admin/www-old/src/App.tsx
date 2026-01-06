/**
 * 应用入口
 * 路由配置和全局 Provider
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { api, setApiAccessToken } from './lib/api';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import OrdersPage from './pages/OrdersPage';
import CreditsPage from './pages/CreditsPage';
import LogsPage from './pages/LogsPage';
import type { CurrentAdmin } from './types';

/** 受保护路由 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { setAdmin, setAccessToken, logout, setLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        const refreshed = await api.post<{ accessToken: string }>('/v1/auth/refresh');
        if (!mounted) return;

        setApiAccessToken(refreshed.accessToken);
        setAccessToken(refreshed.accessToken);

        const me = await api.get<CurrentAdmin>('/v1/auth/me');
        if (!mounted) return;

        if (!me.isAdmin) {
          await api.post('/v1/auth/logout');
          setApiAccessToken(null);
          logout();
          return;
        }

        setAdmin(me);
      } catch {
        setApiAccessToken(null);
        logout();
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, logout, setAccessToken, setAdmin, setLoading]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="users/:id" element={<UserDetailPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="credits" element={<CreditsPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-center" />
    </BrowserRouter>
  );
}

export default App;
