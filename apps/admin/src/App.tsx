/**
 * 应用入口
 * 路由配置和全局 Provider
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { MainLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import UserDetailPage from './pages/UserDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import OrdersPage from './pages/OrdersPage';
import CreditsPage from './pages/CreditsPage';
import LogsPage from './pages/LogsPage';

/** 受保护路由 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
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
