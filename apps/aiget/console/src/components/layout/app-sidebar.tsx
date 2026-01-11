/**
 * AppSidebar - Aiget 控制台侧边栏
 */
import {
  DashboardSquare01Icon,
  PlayIcon,
  Key01Icon,
  WebhookIcon,
  Settings01Icon,
  Link02Icon,
  Brain02Icon,
} from '@hugeicons/core-free-icons';

import { NavMain, type NavGroup } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import {
  Icon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@aiget/ui';

// 导航分组配置
const navGroups: NavGroup[] = [
  {
    // 概览 - 无分组标签
    items: [
      { title: 'Dashboard', url: '/', icon: DashboardSquare01Icon },
      {
        title: 'Playground',
        icon: PlayIcon,
        items: [
          { title: 'Scrape', url: '/playground/scrape' },
          { title: 'Crawl', url: '/playground/crawl' },
          { title: 'Map', url: '/playground/map' },
          { title: 'Extract', url: '/playground/extract' },
          { title: 'Search', url: '/playground/search' },
          { title: 'Embed', url: '/playground/embed' },
        ],
      },
      {
        title: 'Memox',
        icon: Brain02Icon,
        items: [
          { title: 'Playground', url: '/memox/playground' },
          { title: 'Memories', url: '/memox/memories' },
          { title: 'Entities', url: '/memox/entities' },
          { title: 'Graph', url: '/memox/graph' },
        ],
      },
    ],
  },
  {
    label: 'API',
    items: [
      { title: 'API Keys', url: '/api-keys', icon: Key01Icon },
      { title: 'Webhooks', url: '/webhooks', icon: WebhookIcon },
    ],
  },
  {
    label: 'Account',
    items: [{ title: 'Settings', url: '/settings', icon: Settings01Icon }],
  },
];

export interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/">
                <Icon icon={Link02Icon} className="!size-5" />
                <span className="text-base font-semibold">Aiget</span>
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
  );
}
