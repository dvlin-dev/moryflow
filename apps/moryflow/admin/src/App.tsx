/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: 管理后台根路由与全局布局
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { authMethods } from './lib/auth/auth-methods';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import LogsPage from './pages/LogsPage';
import ProvidersPage from './pages/ProvidersPage';
import ModelsPage from './pages/ModelsPage';
import ChatPage from './pages/ChatPage';
import { ImageGenerationTestPage } from './pages/ImageGenerationTestPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import OrdersPage from './pages/OrdersPage';
import PaymentTestPage from './pages/PaymentTestPage';
import StoragePage from './pages/StoragePage';
import LogStoragePage from './pages/LogStoragePage';
import EmailTestPage from './pages/EmailTestPage';
import SitesPage from './pages/SitesPage';
import SiteDetailPage from './pages/SiteDetailPage';
import AgentTracesPage from './pages/AgentTracesPage';
import AgentTracesFailedPage from './pages/AgentTracesFailedPage';
import AgentTraceStoragePage from './pages/AgentTraceStoragePage';
import AlertsPage from './pages/AlertsPage';
import ToolAnalyticsPage from './pages/ToolAnalyticsPage';

/** 受保护路由 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);

  useEffect(() => {
    if (!isBootstrapped) {
      void authMethods.bootstrapAuth();
    }
  }, [isBootstrapped]);

  return (
    <>
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
            <Route path="logs" element={<LogsPage />} />
            <Route path="log-storage" element={<LogStoragePage />} />
            <Route path="providers" element={<ProvidersPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="image-generation" element={<ImageGenerationTestPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="storage" element={<StoragePage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="sites/:id" element={<SiteDetailPage />} />
            <Route path="agent-traces" element={<AgentTracesPage />} />
            <Route path="agent-traces/failed" element={<AgentTracesFailedPage />} />
            <Route path="agent-traces/storage" element={<AgentTraceStoragePage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="tool-analytics" element={<ToolAnalyticsPage />} />
            <Route path="payment-test" element={<PaymentTestPage />} />
            <Route path="email-test" element={<EmailTestPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </>
  );
}

export default App;
