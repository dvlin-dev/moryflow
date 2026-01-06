/**
 * Memory Console - 应用入口
 * 路由配置和全局 Provider
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/auth'
import { MainLayout } from './components/layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MemoryPlaygroundPage from './pages/MemoryPlaygroundPage'
import ApiKeysPage from './pages/ApiKeysPage'
import WebhooksPage from './pages/WebhooksPage'
import WebhookDeliveriesPage from './pages/WebhookDeliveriesPage'
import EntitiesPage from './pages/EntitiesPage'
import MemoriesPage from './pages/MemoriesPage'
import SettingsPage from './pages/SettingsPage'

// React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 分钟
      retry: 1,
    },
  },
})

/** 受保护路由 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
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

            {/* Playground - Memory API 测试 */}
            <Route path="playground" element={<MemoryPlaygroundPage />} />

            {/* API Keys - 密钥管理 */}
            <Route path="api-keys" element={<ApiKeysPage />} />

            {/* Webhooks - 通知配置 */}
            <Route path="webhooks" element={<WebhooksPage />} />

            {/* Webhook Deliveries - 投递日志 */}
            <Route path="webhook-deliveries" element={<WebhookDeliveriesPage />} />

            {/* Entities - 实体管理 */}
            <Route path="entities" element={<EntitiesPage />} />

            {/* Memories - 记忆管理 */}
            <Route path="memories" element={<MemoriesPage />} />

            {/* Settings - 账户设置 */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  )
}

export default App
