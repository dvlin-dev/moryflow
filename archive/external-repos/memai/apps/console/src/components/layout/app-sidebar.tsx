/**
 * AppSidebar - Memory 控制台侧边栏
 */
import {
  LayoutDashboard,
  Play,
  Key,
  Webhook,
  Send,
  Database,
  Settings,
  Brain,
} from 'lucide-react'

import { NavMain, type NavGroup } from '@/components/layout/nav-main'
import { NavUser } from '@/components/layout/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@memai/ui/primitives'

// 导航分组配置
const navGroups: NavGroup[] = [
  {
    // 概览 - 无分组标签
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Playground', url: '/playground', icon: Play },
    ],
  },
  {
    label: 'Data',
    items: [
      { title: 'Memories', url: '/memories', icon: Brain },
      { title: 'Entities', url: '/entities', icon: Database },
    ],
  },
  {
    label: 'API',
    items: [
      { title: 'API Keys', url: '/api-keys', icon: Key },
      { title: 'Webhooks', url: '/webhooks', icon: Webhook },
      { title: 'Delivery Logs', url: '/webhook-deliveries', icon: Send },
    ],
  },
  {
    label: 'Account',
    items: [{ title: 'Settings', url: '/settings', icon: Settings }],
  },
]

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    id: string
    email: string
    name?: string
    avatar?: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <Brain className="!size-5" />
                <span className="text-base font-semibold">Memory</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.name || user.email.split('@')[0],
              email: user.email,
              avatar: user.avatar || '',
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
