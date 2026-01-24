/**
 * AppSidebar - 管理后台侧边栏组件
 * 支持二级可折叠菜单
 */
import {
  Activity01Icon,
  CloudIcon,
  CommandIcon,
  CpuIcon,
  CreditCardIcon,
  DashboardSquare01Icon,
  GlobeIcon,
  Settings01Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';

import { NavMain, type NavGroup } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { Icon } from '@/components/ui/icon';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

// 导航分组配置
const navGroups: NavGroup[] = [
  {
    // 概览 - 无分组标签
    items: [{ title: '仪表盘', url: '/', icon: DashboardSquare01Icon }],
  },
  {
    label: '支付管理',
    items: [
      {
        title: '支付',
        icon: CreditCardIcon,
        items: [
          { title: '订阅管理', url: '/subscriptions' },
          { title: '订单管理', url: '/orders' },
          { title: 'License', url: '/licenses' },
        ],
      },
    ],
  },
  {
    label: 'AI 服务',
    items: [
      {
        title: '模型配置',
        icon: CpuIcon,
        items: [
          { title: '提供商', url: '/providers' },
          { title: '模型', url: '/models' },
        ],
      },
      {
        title: 'Agent 追踪',
        icon: Activity01Icon,
        items: [
          { title: '概览', url: '/agent-traces' },
          { title: '失败记录', url: '/agent-traces/failed' },
          { title: 'Tool 分析', url: '/tool-analytics' },
          { title: '告警管理', url: '/alerts' },
          { title: '存储管理', url: '/agent-traces/storage' },
        ],
      },
    ],
  },
  {
    label: '内容管理',
    items: [
      {
        title: '站点管理',
        icon: GlobeIcon,
        url: '/sites',
      },
      {
        title: '云同步',
        icon: CloudIcon,
        url: '/storage',
      },
    ],
  },
  {
    label: '系统',
    items: [
      {
        title: '管理',
        icon: Settings01Icon,
        items: [
          { title: '用户管理', url: '/users' },
          { title: '操作日志', url: '/logs' },
          { title: '日志存储', url: '/log-storage' },
        ],
      },
    ],
  },
  {
    label: '开发工具',
    items: [
      {
        title: '测试',
        icon: Wrench01Icon,
        items: [
          { title: '支付测试', url: '/payment-test' },
          { title: '邮件测试', url: '/email-test' },
          { title: '聊天测试', url: '/chat' },
          { title: '图片生成', url: '/image-generation' },
        ],
      },
    ],
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
                <Icon icon={CommandIcon} className="!size-5" />
                <span className="text-base font-semibold">Moryflow</span>
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
