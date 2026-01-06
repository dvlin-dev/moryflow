/**
 * MainLayout - 主布局组件
 * 包装 SidebarProvider 和 AppSidebar，支持响应式布局
 */
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { AppSidebar } from './app-sidebar'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Separator,
} from '@memai/ui/primitives'

export function MainLayout() {
  const user = useAuthStore((state) => state.user)

  // 转换 user 类型以匹配 AppSidebar 的期望
  const sidebarUser = user
    ? {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined, // null -> undefined
      }
    : undefined

  return (
    <SidebarProvider>
      <AppSidebar user={sidebarUser} />
      <SidebarInset>
        {/* 移动端头部 */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-semibold">Memai</span>
        </header>
        {/* 主内容区 */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
