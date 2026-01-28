/**
 * [PROPS]: 无
 * [EMITS]: route change
 * [POS]: Console 应用入口与路由保护（基于 /api/v1/app/user/me 进行会话引导）
 *         Agent Browser/Fetchx/Memox 路由在此统一挂载
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/auth';
import { MainLayout } from './components/layout';
import LoginRedirect from './pages/LoginRedirect';
import DashboardPage from './pages/DashboardPage';
import ScrapePlaygroundPage from './pages/ScrapePlaygroundPage';
import CrawlPlaygroundPage from './pages/CrawlPlaygroundPage';
import MapPlaygroundPage from './pages/MapPlaygroundPage';
import ExtractPlaygroundPage from './pages/ExtractPlaygroundPage';
import SearchPlaygroundPage from './pages/SearchPlaygroundPage';
import EmbedPlaygroundPage from './pages/EmbedPlaygroundPage';
import AgentBrowserLayoutPage from './pages/agent-browser/AgentBrowserLayoutPage';
import AgentBrowserOverviewPage from './pages/agent-browser/AgentBrowserOverviewPage';
import AgentBrowserBrowserPage from './pages/agent-browser/AgentBrowserBrowserPage';
import AgentBrowserAgentPage from './pages/agent-browser/AgentBrowserAgentPage';
import AgentBrowserNetworkPage from './pages/agent-browser/AgentBrowserNetworkPage';
import AgentBrowserDiagnosticsPage from './pages/agent-browser/AgentBrowserDiagnosticsPage';
import AgentBrowserStoragePage from './pages/agent-browser/AgentBrowserStoragePage';
import AgentBrowserProfilePage from './pages/agent-browser/AgentBrowserProfilePage';
import AgentBrowserStreamingPage from './pages/agent-browser/AgentBrowserStreamingPage';
import AgentBrowserCdpPage from './pages/agent-browser/AgentBrowserCdpPage';
import MemoriesPage from './pages/MemoriesPage';
import EntitiesPage from './pages/EntitiesPage';
import GraphPage from './pages/GraphPage';
import MemoxPlaygroundPage from './pages/MemoxPlaygroundPage';
import ApiKeysPage from './pages/ApiKeysPage';
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
  const location = useLocation();

  if (!isBootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return <>{children}</>;
}

function App() {
  const isBootstrapped = useAuthStore((state) => state.isBootstrapped);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    if (!isBootstrapped) {
      void bootstrap();
    }
  }, [bootstrap, isBootstrapped]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRedirect />} />
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

            {/* Fetchx - API 测试 */}
            <Route path="fetchx">
              <Route index element={<Navigate to="/fetchx/scrape" replace />} />
              <Route path="playground" element={<Navigate to="/fetchx/scrape" replace />} />
              <Route path="scrape" element={<ScrapePlaygroundPage />} />
              <Route path="crawl" element={<CrawlPlaygroundPage />} />
              <Route path="map" element={<MapPlaygroundPage />} />
              <Route path="extract" element={<ExtractPlaygroundPage />} />
              <Route path="search" element={<SearchPlaygroundPage />} />
              <Route path="embed" element={<EmbedPlaygroundPage />} />
            </Route>

            {/* Agent Browser - Agent + Browser 测试 */}
            <Route path="agent-browser" element={<AgentBrowserLayoutPage />}>
              <Route index element={<Navigate to="/agent-browser/overview" replace />} />
              <Route path="overview" element={<AgentBrowserOverviewPage />} />
              <Route path="browser" element={<AgentBrowserBrowserPage />} />
              <Route path="agent" element={<AgentBrowserAgentPage />} />
              <Route path="network" element={<AgentBrowserNetworkPage />} />
              <Route path="diagnostics" element={<AgentBrowserDiagnosticsPage />} />
              <Route path="storage" element={<AgentBrowserStoragePage />} />
              <Route path="profile" element={<AgentBrowserProfilePage />} />
              <Route path="streaming" element={<AgentBrowserStreamingPage />} />
              <Route path="cdp" element={<AgentBrowserCdpPage />} />
            </Route>

            {/* Memox - AI 记忆管理 */}
            <Route path="memox">
              <Route index element={<Navigate to="/memox/playground" replace />} />
              <Route path="playground" element={<MemoxPlaygroundPage />} />
              <Route path="memories" element={<MemoriesPage />} />
              <Route path="entities" element={<EntitiesPage />} />
              <Route path="graph" element={<GraphPage />} />
            </Route>

            {/* API Keys - 密钥管理 */}
            <Route path="api-keys" element={<ApiKeysPage />} />

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
