/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Console 应用入口与路由保护
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
import ScreenshotPlaygroundPage from './pages/ScreenshotPlaygroundPage';
import EmbedPlaygroundPage from './pages/EmbedPlaygroundPage';
import ApiKeysPage from './pages/ApiKeysPage';
import ScreenshotsPage from './pages/ScreenshotsPage';
import WebhooksPage from './pages/WebhooksPage';
import SettingsPage from './pages/SettingsPage';

// React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 分钟
      retry: 1,
    },
  },
});

/** 受保护路由 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard - 用量概览 */}
            <Route index element={<DashboardPage />} />

            {/* Playground - API 测试 */}
            <Route path="playground">
              <Route index element={<Navigate to="/playground/screenshot" replace />} />
              <Route path="screenshot" element={<ScreenshotPlaygroundPage />} />
              <Route path="embed" element={<EmbedPlaygroundPage />} />
            </Route>

            {/* API Keys - 密钥管理 */}
            <Route path="api-keys" element={<ApiKeysPage />} />

            {/* Screenshots - 截图历史 */}
            <Route path="screenshots" element={<ScreenshotsPage />} />

            {/* Webhooks - 通知配置 */}
            <Route path="webhooks" element={<WebhooksPage />} />

            {/* Settings - 账户设置 */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
