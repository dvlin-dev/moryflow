/**
 * [PROPS]: AppSidebarProps
 * [EMITS]: None
 * [POS]: Anyhunt 控制台侧边栏
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */
import {
  DashboardSquare01Icon,
  PlayIcon,
  Key01Icon,
  WebhookIcon,
  Settings01Icon,
  Link02Icon,
  Brain02Icon,
  Mail01Icon,
  AiBrowserIcon,
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
} from '@anyhunt/ui';

// 导航分组配置
const navGroups: NavGroup[] = [
  {
    // 概览 - 无分组标签
    items: [
      { title: 'Dashboard', url: '/', icon: DashboardSquare01Icon },
      {
        title: 'Fetchx',
        icon: PlayIcon,
        items: [
          { title: 'Playground', url: '/fetchx/playground' },
          { title: 'Scrape', url: '/fetchx/scrape' },
          { title: 'Crawl', url: '/fetchx/crawl' },
          { title: 'Map', url: '/fetchx/map' },
          { title: 'Extract', url: '/fetchx/extract' },
          { title: 'Search', url: '/fetchx/search' },
          { title: 'Embed', url: '/fetchx/embed' },
        ],
      },
      {
        title: 'Agent Browser',
        icon: AiBrowserIcon,
        items: [
          { title: 'Overview', url: '/agent-browser/overview' },
          { title: 'Browser', url: '/agent-browser/browser' },
          { title: 'Agent', url: '/agent-browser/agent' },
          { title: 'Network', url: '/agent-browser/network' },
          { title: 'Diagnostics', url: '/agent-browser/diagnostics' },
          { title: 'Storage', url: '/agent-browser/storage' },
          { title: 'Profile', url: '/agent-browser/profile' },
          { title: 'Streaming', url: '/agent-browser/streaming' },
          { title: 'CDP', url: '/agent-browser/cdp' },
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
    label: 'Products',
    items: [
      {
        title: 'Digest',
        url: 'https://anyhunt.app/dashboard',
        icon: Mail01Icon,
        external: true,
      },
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
  const displayUser = user
    ? {
        name: user.name?.trim() || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email ?? '',
        avatar: user.avatar ?? '',
      }
    : null;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="/">
                <Icon icon={Link02Icon} className="!size-5" />
                <span className="text-base font-semibold">Anyhunt</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>{displayUser && <NavUser user={displayUser} />}</SidebarFooter>
    </Sidebar>
  );
}
